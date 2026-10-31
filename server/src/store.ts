import { FieldValue, Firestore, Timestamp, type DocumentReference } from '@google-cloud/firestore'

import type { Completion, PollerState } from './detect.js'
import { emptyState } from './detect.js'

export interface CompletionRecord {
  character_id: string
  quest_id: string
  /** heroic | epic | legendary — one document per character, quest and version. */
  band: string
  finished: boolean
  last_finished_at: Timestamp | null
  /** Completion timestamps, newest first. Capped at HISTORY_LIMIT. */
  history: Timestamp[]
  level_at_finish: number | null
  source: 'poll' | 'manual'
  updated_at: Timestamp
}

/** Enough repeats to detect a ransacked quest without growing without bound. */
export const HISTORY_LIMIT = 10

/**
 * Every collection this app owns is prefixed, so the default database stays readable
 * when another app shares the project. The data was migrated to these names in one
 * move on 2026-10-29; there is no unprefixed fallback, so an image rollback past that
 * change reads empty collections.
 */
export const COLLECTION_PREFIX = 'ddo_log_'

const db = new Firestore()
const completions = db.collection(`${COLLECTION_PREFIX}completions`)
const edits = db.collection(`${COLLECTION_PREFIX}edits`)
const reincarnations = db.collection(`${COLLECTION_PREFIX}reincarnations`)
const stateDocument = db.doc(`${COLLECTION_PREFIX}state/poller`)
/** Bumped on every completion write so clients can poll one small document. */
const revisionDocument = db.doc(`${COLLECTION_PREFIX}state/revision`)

export const completionId = (characterId: string, questId: string, band: string): string =>
  `${characterId}_${questId}_${band}`

/** Older documents only have last_finished_at; treat it as a one-entry history. */
function historyOf(data: Partial<CompletionRecord> | null): Timestamp[] {
  if (!data) return []
  if (Array.isArray(data.history) && data.history.length > 0) return data.history
  return data.last_finished_at ? [data.last_finished_at] : []
}

function withHistoryEntry(history: Timestamp[], at: Timestamp): Timestamp[] {
  const millis = at.toMillis()
  return [at, ...history.filter((entry) => entry.toMillis() !== millis)]
    .sort((left, right) => right.toMillis() - left.toMillis())
    .slice(0, HISTORY_LIMIT)
}

/**
 * The state an edit replaces, stored on the edit document. Without it the log says
 * what a row became but not what it was, so a wrong bulk edit cannot be undone.
 * Entries written before this existed only carry the new value.
 */
function previousOf(existing: CompletionRecord | null) {
  return {
    // An edit that creates a row must be undone by deleting it, not by resetting flags.
    previous_exists: existing !== null,
    previous_finished: existing?.finished === true,
    previous_history: historyOf(existing),
    previous_level_at_finish: existing?.level_at_finish ?? null,
    previous_source: existing?.source ?? null,
  }
}

type SerializedCompletions = Record<string, Record<string, unknown>>

// GET /completions is public. Without this cache each request scans the whole
// collection, which is both a bill and a way to starve the poller on the single
// instance. 15s of staleness is invisible in the UI.
const LIST_CACHE_TTL_MS = 15_000
let listCache: { json: string; expiresAt: number } | null = null
// Bumped on every write: a read that started before the write must not repopulate
// the cache with the pre-write snapshot.
let listEpoch = 0
let listInFlight: Promise<string> | null = null

export function invalidateCompletionsCache(): void {
  listCache = null
  listEpoch += 1
  bumpRevision()
}

/**
 * Cheap change probe for the page's auto-refresh. Polling this one document costs one
 * read; re-reading `GET /completions` costs one read per completion (846 today), which
 * a 30 s refresh would turn into ~48x the Firestore free tier for a single open tab.
 */
export async function completionsRevision(): Promise<number> {
  const snapshot = await revisionDocument.get()
  const revision = snapshot.get('revision')
  return typeof revision === 'number' ? revision : 0
}

function bumpRevision(): void {
  // Off the request path and best effort: a lost bump only delays the next client
  // refresh until the following write.
  void revisionDocument
    .set({ revision: FieldValue.increment(1), at: Timestamp.now() }, { merge: true })
    .catch((error) => {
      console.warn('completion revision bump failed', error)
    })
}

/**
 * Serialized body for GET /completions. The string is cached, not just the object,
 * so a public request costs no re-stringify on the single instance.
 */
export async function listCompletionsJson(): Promise<string> {
  if (listCache && listCache.expiresAt > Date.now()) return listCache.json
  // Single-flight: a public endpoint should never fan a cold cache out into N scans.
  if (listInFlight) return listInFlight

  listInFlight = loadCompletionsJson(listEpoch).finally(() => {
    listInFlight = null
  })
  return listInFlight
}

async function loadCompletionsJson(epoch: number): Promise<string> {
  const snapshot = await completions.get()
  const result: SerializedCompletions = {}

  for (const document of snapshot.docs) {
    const data = document.data() as CompletionRecord
    const characterId = data.character_id
    const questId = data.quest_id
    if (!characterId || !questId) continue

    const history = historyOf(data)
    const band = data.band ?? 'heroic'
    const bucket = result[characterId] ?? {}
    bucket[`${questId}:${band}`] = {
      finished: data.finished === true,
      lastFinishedAt: history[0]?.toDate().toISOString() ?? null,
      history: history.map((entry) => entry.toDate().toISOString()),
      levelAtFinish: data.level_at_finish ?? null,
      source: data.source ?? 'poll',
    }
    result[characterId] = bucket
  }

  const json = JSON.stringify({ data: result })
  if (epoch === listEpoch) {
    listCache = { json, expiresAt: Date.now() + LIST_CACHE_TTL_MS }
  }
  return json
}

/**
 * Writes a polled completion unless we already recorded something newer.
 * The timestamp comparison is the only dedupe needed: a retried poll carries the
 * same exit time and is skipped.
 */
export async function recordPolledCompletion(completion: Completion): Promise<boolean> {
  const reference = completions.doc(
    completionId(completion.characterId, completion.questId, completion.band),
  )

  const exitAt = Timestamp.fromDate(completion.exitAt)

  const written = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    const history = historyOf(current.exists ? (current.data() as CompletionRecord) : null)

    // Timestamp comparison is the only dedupe needed: a retried poll carries the
    // same exit time and is skipped.
    if (history[0] && history[0].toMillis() >= exitAt.toMillis()) return false

    transaction.set(
      reference,
      {
        character_id: completion.characterId,
        quest_id: completion.questId,
        band: completion.band,
        finished: true,
        last_finished_at: exitAt,
        history: withHistoryEntry(history, exitAt),
        level_at_finish: completion.level,
        source: 'poll',
        updated_at: Timestamp.now(),
      } satisfies CompletionRecord,
      { merge: true },
    )
    return true
  })

  // Only after commit, so a concurrent read cannot cache the pre-write snapshot.
  if (written) invalidateCompletionsCache()
  return written
}

export interface ManualEdit {
  characterId: string
  questId: string
  band: string
  finished: boolean
  /** undefined keeps the stored timestamp, null clears it (backfill without a date). */
  lastFinishedAt: Date | null | undefined
  level: number | null
}

/** Applies several edits in one transaction; returns the number written. */
export async function applyManualEdits(changes: ManualEdit[]): Promise<number> {
  if (changes.length === 0) return 0

  // Firestore allows one write per document per transaction, so collapse duplicates
  // (last edit wins) before building the refs.
  const deduped = [...new Map(changes.map((edit) => [completionId(edit.characterId, edit.questId, edit.band), edit])).values()]
  changes = deduped

  const refs = changes.map((edit) =>
    completions.doc(completionId(edit.characterId, edit.questId, edit.band)),
  )

  const written = await db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...refs)

    changes.forEach((edit, index) => {
      const existing = snapshots[index].exists ? (snapshots[index].data() as CompletionRecord) : null

      const previousHistory = historyOf(existing)
      const history =
        edit.lastFinishedAt === undefined
          ? previousHistory
          : edit.lastFinishedAt === null
            ? []
            : withHistoryEntry(previousHistory, Timestamp.fromDate(edit.lastFinishedAt))

      transaction.set(
        refs[index],
        {
          character_id: edit.characterId,
          quest_id: edit.questId,
          band: edit.band,
          finished: edit.finished,
          last_finished_at: history[0] ?? null,
          history,
          level_at_finish: existing?.level_at_finish ?? edit.level,
          source: 'manual',
          updated_at: Timestamp.now(),
        } satisfies CompletionRecord,
        { merge: true },
      )

      transaction.set(edits.doc(), {
        character_id: edit.characterId,
        quest_id: edit.questId,
        band: edit.band,
        finished: edit.finished,
        last_finished_at: history[0] ?? null,
        history,
        at: Timestamp.now(),
        writer: null,
        ...previousOf(existing),
      })
    })

    return changes.length
  })

  invalidateCompletionsCache()
  return written
}

export async function applyManualEdit(edit: ManualEdit): Promise<CompletionRecord> {
  const reference = completions.doc(completionId(edit.characterId, edit.questId, edit.band))

  const record = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    const existing = current.exists ? (current.data() as CompletionRecord) : null

    // Unchecking keeps the observed history so the same visit cannot be re-applied.
    const previousHistory = historyOf(existing)
    const history =
      edit.lastFinishedAt === undefined
        ? previousHistory
        : edit.lastFinishedAt === null
          ? []
          : withHistoryEntry(previousHistory, Timestamp.fromDate(edit.lastFinishedAt))

    const lastFinishedAt = history[0] ?? null

    const record: CompletionRecord = {
      character_id: edit.characterId,
      quest_id: edit.questId,
      band: edit.band,
      finished: edit.finished,
      last_finished_at: lastFinishedAt,
      history,
      level_at_finish: existing?.level_at_finish ?? edit.level,
      source: 'manual',
      updated_at: Timestamp.now(),
    }

    transaction.set(reference, record, { merge: true })
    transaction.set(edits.doc(), {
      character_id: edit.characterId,
      quest_id: edit.questId,
      band: edit.band,
      finished: edit.finished,
      last_finished_at: lastFinishedAt,
      history,
      at: Timestamp.now(),
      writer: null,
      ...previousOf(existing),
    })

    return record
  })

  invalidateCompletionsCache()
  return record
}

export interface ReincarnationInfo {
  at: string
  source: 'auto' | 'manual'
}

/**
 * Latest reincarnation per character. Quest `finished` flags are reset when one is
 * recorded, but `history` is kept so the previous life stays readable.
 */
export async function listReincarnations(): Promise<Record<string, ReincarnationInfo>> {
  const snapshot = await reincarnations.get()
  const result: Record<string, ReincarnationInfo> = {}

  for (const document of snapshot.docs) {
    const data = document.data() as { character_id?: string; at?: Timestamp; source?: string }
    if (!data.character_id || !data.at) continue
    result[data.character_id] = {
      at: data.at.toDate().toISOString(),
      source: data.source === 'auto' ? 'auto' : 'manual',
    }
  }

  return result
}

export async function recordReincarnation(
  characterId: string,
  at: Date,
  source: 'auto' | 'manual',
): Promise<{ recorded: boolean; effectiveAt: Date }> {
  const reference = reincarnations.doc(characterId)
  const current = await reference.get()
  const storedAt = current.exists ? (current.get('at') as Timestamp | null) : null

  // Never rewind the boundary, and tell the caller which time is actually in force:
  // a late detection must not resurrect a previous life, nor a reset use the older
  // requested time.
  if (storedAt && storedAt.toMillis() >= at.getTime()) {
    return { recorded: false, effectiveAt: storedAt.toDate() }
  }

  await reference.set(
    {
      character_id: characterId,
      at: Timestamp.fromDate(at),
      source,
      updated_at: Timestamp.now(),
    },
    { merge: true },
  )
  // A TR moves the "current life" boundary even when it flips no checkboxes, and the
  // page derives the TR chip and ransack window from it.
  invalidateCompletionsCache()
  return { recorded: true, effectiveAt: at }
}

/**
 * Re-derives the checkboxes for one life: a row is `finished` only when its newest
 * completion happened at or after the reincarnation. History and timestamps are left
 * untouched, so the previous life is preserved.
 */
export async function resetCompletionsForLife(
  characterId: string,
  at: Date,
  source: 'auto' | 'manual' = 'manual',
): Promise<number> {
  const snapshot = await completions.where('character_id', '==', characterId).get()
  const threshold = at.getTime()
  const updates: Array<{ ref: DocumentReference; finished: boolean }> = []

  for (const document of snapshot.docs) {
    const data = document.data() as CompletionRecord
    const latest = historyOf(data)[0]
    const finished = latest !== undefined && latest.toMillis() >= threshold
    if (finished !== (data.finished === true)) updates.push({ ref: document.ref, finished })
  }

  const chunkSize = 400
  for (let index = 0; index < updates.length; index += chunkSize) {
    const batch = db.batch()
    for (const update of updates.slice(index, index + chunkSize)) {
      batch.set(
        update.ref,
        { finished: update.finished, source, updated_at: Timestamp.now() },
        { merge: true },
      )
    }
    await batch.commit()
  }

  if (updates.length > 0) invalidateCompletionsCache()
  return updates.length
}

export async function loadPollerState(): Promise<PollerState> {
  const snapshot = await stateDocument.get()
  if (!snapshot.exists) return emptyState()

  const data = snapshot.data() as Partial<PollerState>
  return {
    lastPollAt: data.lastPollAt ?? null,
    characters: data.characters ?? {},
  }
}

/**
 * Saves the poller state only if no other run advanced it since this one loaded.
 * Completions are already committed at this point and are deduped by timestamp,
 * so a rejected save is safe to drop.
 */
export async function savePollerState(
  state: PollerState,
  expectedLastPollAt: string | null,
): Promise<boolean> {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateDocument)
    const current = snapshot.exists ? ((snapshot.data() as Partial<PollerState>).lastPollAt ?? null) : null
    if (current !== expectedLastPollAt) return false

    transaction.set(stateDocument, state)
    return true
  })
}
