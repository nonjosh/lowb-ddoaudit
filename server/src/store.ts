import { Firestore, Timestamp } from '@google-cloud/firestore'

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

const db = new Firestore()
const completions = db.collection('completions')
const edits = db.collection('edits')
const stateDocument = db.doc('state/poller')

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

type SerializedCompletions = Record<string, Record<string, unknown>>

// GET /completions is public. Without this cache each request scans the whole
// collection, which is both a bill and a way to starve the poller on the single
// instance. 15s of staleness is invisible in the UI.
const LIST_CACHE_TTL_MS = 15_000
let listCache: { data: SerializedCompletions; expiresAt: number } | null = null
// Bumped on every write: a read that started before the write must not repopulate
// the cache with the pre-write snapshot.
let listEpoch = 0
let listInFlight: Promise<SerializedCompletions> | null = null

export function invalidateCompletionsCache(): void {
  listCache = null
  listEpoch += 1
}

export async function listCompletions(): Promise<SerializedCompletions> {
  if (listCache && listCache.expiresAt > Date.now()) return listCache.data
  // Single-flight: a public endpoint should never fan a cold cache out into N scans.
  if (listInFlight) return listInFlight

  listInFlight = loadCompletions(listEpoch).finally(() => {
    listInFlight = null
  })
  return listInFlight
}

async function loadCompletions(epoch: number): Promise<SerializedCompletions> {
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

  if (epoch === listEpoch) {
    listCache = { data: result, expiresAt: Date.now() + LIST_CACHE_TTL_MS }
  }
  return result
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
      at: Timestamp.now(),
      writer: null,
    })

    return record
  })

  invalidateCompletionsCache()
  return record
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
