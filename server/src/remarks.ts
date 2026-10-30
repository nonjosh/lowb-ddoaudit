import { Firestore, Timestamp } from '@google-cloud/firestore'

import { COLLECTION_PREFIX } from './store.js'

/**
 * Shared player notes ("find character"). One document per real player, keyed by the
 * DDO Audit character id of the note's owner; `smurfs` lists every character of that
 * player with its id, so the client can bulk-fetch fresh data for all of them.
 */

export type RemarkVerdict = 'good' | 'info' | 'avoid'

export interface RemarkClass {
  name: string
  level: number
}

export interface RemarkSmurf {
  /** DDO Audit character id; null for a name the API does not know yet. */
  id: string | null
  name: string
}

export interface RemarkRecord {
  character_id: string
  character_name: string
  verdict: RemarkVerdict
  note: string
  level: number | null
  classes: RemarkClass[]
  smurfs: RemarkSmurf[]
  updated_at: Timestamp
}

export interface Remark {
  characterId: string
  characterName: string
  verdict: RemarkVerdict
  note: string
  level: number | null
  classes: RemarkClass[]
  smurfs: RemarkSmurf[]
  updatedAt: string
}

/** A field the request did not send keeps its stored value. */
export interface RemarkInput {
  characterId: string
  characterName: string
  verdict: RemarkVerdict
  note: string
  level: number | null | undefined
  classes: RemarkClass[] | undefined
  smurfs: RemarkSmurf[] | undefined
}

const MAX_NOTE_LENGTH = 2000
const MAX_SMURFS = 20
const MAX_CLASSES = 12
const MAX_NAME_LENGTH = 64
const CACHE_TTL_MS = 15_000

const db = new Firestore()
const remarks = db.collection(`${COLLECTION_PREFIX}remarks`)

export function remarkKey(name: string): string {
  return name.trim().toLowerCase()
}

function toRemark(record: RemarkRecord): Remark {
  return {
    characterId: record.character_id,
    characterName: record.character_name,
    verdict: record.verdict,
    note: record.note,
    level: record.level ?? null,
    classes: Array.isArray(record.classes) ? record.classes : [],
    smurfs:
      Array.isArray(record.smurfs) && record.smurfs.length
        ? record.smurfs
        : [{ id: record.character_id, name: record.character_name ?? '' }],
    updatedAt:
      typeof record.updated_at?.toDate === 'function'
        ? record.updated_at.toDate().toISOString()
        : new Date(0).toISOString(),
  }
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

export function parseCharacterId(raw: unknown): Parsed<string> {
  const value = typeof raw === 'number' ? String(raw) : raw
  if (typeof value !== 'string' || !/^\d{1,20}$/.test(value.trim())) {
    return { ok: false, message: 'character id must be a number' }
  }
  return { ok: true, value: value.trim() }
}

export function parseCharacterName(raw: unknown): Parsed<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'character name must be a string' }
  const value = raw.trim()
  if (!value || value.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `character name must be 1-${MAX_NAME_LENGTH} characters` }
  }
  // Control characters would corrupt the display and the client-side keys.
  if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false, message: 'character name has invalid characters' }
  return { ok: true, value }
}

function parseVerdict(raw: unknown): Parsed<RemarkVerdict> {
  if (raw === 'good' || raw === 'info' || raw === 'avoid') return { ok: true, value: raw }
  return { ok: false, message: 'verdict must be good, info or avoid' }
}

function parseNote(raw: unknown): Parsed<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'note must be a string' }
  if (raw.length > MAX_NOTE_LENGTH) return { ok: false, message: `note must be at most ${MAX_NOTE_LENGTH} characters` }
  return { ok: true, value: raw.trim() }
}

function parseLevel(raw: unknown): Parsed<number | null | undefined> {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null) return { ok: true, value: null }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 60) {
    return { ok: false, message: 'level must be an integer between 0 and 60' }
  }
  return { ok: true, value: raw }
}

function parseClasses(raw: unknown): Parsed<RemarkClass[] | undefined> {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw)) return { ok: false, message: 'classes must be an array' }
  if (raw.length > MAX_CLASSES) return { ok: false, message: `classes must be at most ${MAX_CLASSES} entries` }

  const classes: RemarkClass[] = []
  for (const entry of raw) {
    const name = (entry as { name?: unknown } | null)?.name
    const level = (entry as { level?: unknown } | null)?.level
    if (typeof name !== 'string' || !name.trim() || name.length > 40) {
      return { ok: false, message: 'each class needs a name of at most 40 characters' }
    }
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 60) {
      return { ok: false, message: 'each class needs a level between 0 and 60' }
    }
    classes.push({ name: name.trim(), level })
  }
  return { ok: true, value: classes }
}

function parseSmurfs(raw: unknown, owner: RemarkSmurf): Parsed<RemarkSmurf[] | undefined> {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null) return { ok: true, value: [owner] }
  if (!Array.isArray(raw)) return { ok: false, message: 'smurfs must be an array' }
  if (raw.length > MAX_SMURFS) return { ok: false, message: `smurfs must be at most ${MAX_SMURFS} entries` }

  const smurfs: RemarkSmurf[] = [owner]
  const seenIds = new Set<string>([owner.id ?? ''])
  const seenNames = new Set<string>([remarkKey(owner.name)])

  for (const entry of raw) {
    // A bare name is accepted so an older client cannot be locked out.
    const rawName = typeof entry === 'string' ? entry : (entry as { name?: unknown } | null)?.name
    const name = parseCharacterName(rawName)
    if (!name.ok) return name

    const rawId = typeof entry === 'string' ? null : (entry as { id?: unknown } | null)?.id
    let id: string | null = null
    if (rawId !== undefined && rawId !== null) {
      const parsedId = parseCharacterId(rawId)
      if (!parsedId.ok) return parsedId
      id = parsedId.value
    }

    if (id && seenIds.has(id)) continue
    if (seenNames.has(remarkKey(name.value))) continue
    if (id) seenIds.add(id)
    seenNames.add(remarkKey(name.value))
    smurfs.push({ id, name: name.value })
  }

  if (smurfs.length > MAX_SMURFS) return { ok: false, message: `smurfs must be at most ${MAX_SMURFS} entries` }
  return { ok: true, value: smurfs }
}

export function parseRemarkInput(characterIdParam: unknown, body: unknown): Parsed<RemarkInput> {
  const id = parseCharacterId(characterIdParam)
  if (!id.ok) return id
  const raw = (body ?? {}) as Record<string, unknown>

  const name = parseCharacterName(raw.characterName)
  if (!name.ok) return name
  const verdict = parseVerdict(raw.verdict)
  if (!verdict.ok) return verdict
  const note = parseNote(raw.note ?? '')
  if (!note.ok) return note
  const level = parseLevel(raw.level)
  if (!level.ok) return level
  const classes = parseClasses(raw.classes)
  if (!classes.ok) return classes
  const smurfs = parseSmurfs(raw.smurfs, { id: id.value, name: name.value })
  if (!smurfs.ok) return smurfs

  return {
    ok: true,
    value: {
      characterId: id.value,
      characterName: name.value,
      verdict: verdict.value,
      note: note.value,
      level: level.value,
      classes: classes.value,
      smurfs: smurfs.value,
    },
  }
}

let listCache: { json: string; expiresAt: number } | null = null
let listInFlight: Promise<string> | null = null
let listEpoch = 0

/** Serialized once and cached: the list is read on every page load. */
export async function listRemarksJson(): Promise<string> {
  if (listCache && listCache.expiresAt > Date.now()) return listCache.json
  if (listInFlight) return listInFlight

  listInFlight = loadRemarksJson(listEpoch).finally(() => {
    listInFlight = null
  })
  return listInFlight
}

async function loadRemarksJson(epoch: number): Promise<string> {
  const snapshot = await remarks.get()
  const data = snapshot.docs.map((document) => toRemark(document.data() as RemarkRecord))
  const json = JSON.stringify({ data })
  if (epoch === listEpoch) listCache = { json, expiresAt: Date.now() + CACHE_TTL_MS }
  return json
}

function invalidateRemarksCache(): void {
  listEpoch += 1
  listCache = null
  // A load that started before the write must not answer the next GET.
  listInFlight = null
}

function smurfsOf(record: Partial<RemarkRecord>): RemarkSmurf[] {
  return Array.isArray(record.smurfs) && record.smurfs.length
    ? record.smurfs
    : [{ id: record.character_id ?? null, name: record.character_name ?? '' }]
}

/** Dedupes by id first, then by name, keeping the order given. */
export function mergeSmurfs(left: RemarkSmurf[], right: RemarkSmurf[]): RemarkSmurf[] {
  const out: RemarkSmurf[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const smurf of [...left, ...right]) {
    if (smurf.id && ids.has(smurf.id)) continue
    if (names.has(remarkKey(smurf.name))) continue
    if (smurf.id) ids.add(smurf.id)
    names.add(remarkKey(smurf.name))
    out.push(smurf)
    if (out.length >= MAX_SMURFS) break
  }
  return out
}

/** What is left of a note's characters once another note claims some of them. */
export function remainingSmurfs(
  previous: RemarkSmurf[],
  takenIds: Set<string>,
  takenNames: Set<string>,
): RemarkSmurf[] {
  // Match by id when both sides have one, and always by name: a claim that arrived
  // without an id (typed, not resolved) must still take the character out of a note.
  return previous.filter(
    (smurf) => !(smurf.id && takenIds.has(smurf.id)) && !takenNames.has(remarkKey(smurf.name)),
  )
}

/**
 * Saves the note and removes those characters from every other note, so one character
 * never appears in two notes. A note that loses its own owner is re-keyed to its first
 * remaining smurf with a known id (or deleted when nothing is left).
 *
 * Runs in one transaction: the reads decide the whole move, so two people saving at the
 * same moment cannot leave a character in two notes or clobber each other's document.
 */
export async function saveRemark(input: RemarkInput): Promise<Remark> {
  const reference = remarks.doc(input.characterId)

  const record = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    const snapshot = await transaction.get(remarks)
    const stored = current.exists ? (current.data() as Partial<RemarkRecord>) : null

    const next: RemarkRecord = {
      character_id: input.characterId,
      character_name: input.characterName,
      verdict: input.verdict,
      note: input.note,
      level: input.level === undefined ? (typeof stored?.level === 'number' ? stored.level : null) : input.level,
      classes: input.classes === undefined ? (Array.isArray(stored?.classes) ? stored.classes : []) : input.classes,
      smurfs:
        input.smurfs === undefined
          ? smurfsOf({
              ...stored,
              character_id: input.characterId,
              character_name: input.characterName,
            })
          : input.smurfs,
      updated_at: Timestamp.now(),
    }

    // shortcut: the whole collection is read per save, fine for dozens of notes; move to a
    // query per smurf if the list ever grows past a few hundred.
    const takenIds = new Set(next.smurfs.map((smurf) => smurf.id).filter((id): id is string => Boolean(id)))
    const takenNames = new Set(next.smurfs.map((smurf) => remarkKey(smurf.name)))
    const existing = new Map(snapshot.docs.map((document) => [document.id, document.data() as RemarkRecord]))

    // shortcut: last write wins. Two people editing the same player within the 15 s cache
    // window means the later Save replaces the note; add an updated_at precondition if that
    // ever matters.
    transaction.set(reference, next)

    for (const document of snapshot.docs) {
      if (document.id === input.characterId) continue
      const other = document.data() as RemarkRecord
      const previous = smurfsOf(other)
      const remaining = remainingSmurfs(previous, takenIds, takenNames)
      if (remaining.length === previous.length) continue

      if (!remaining.length) {
        transaction.delete(document.ref)
        continue
      }

      const nextOwner = remaining.find((smurf) => smurf.id) ?? remaining[0]
      if (!nextOwner.id) {
        // A note cannot be keyed by an unknown name; drop it rather than orphan it.
        transaction.delete(document.ref)
        continue
      }

      if (nextOwner.id === document.id) {
        transaction.set(document.ref, { ...other, smurfs: remaining, updated_at: Timestamp.now() })
        continue
      }

      const target = existing.get(nextOwner.id)
      if (target) {
        // Never overwrite another player's note: keep its verdict/note and add the links.
        transaction.set(remarks.doc(nextOwner.id), {
          ...target,
          smurfs: mergeSmurfs(smurfsOf(target), remaining),
          updated_at: Timestamp.now(),
        })
      } else {
        transaction.set(remarks.doc(nextOwner.id), {
          ...other,
          character_id: nextOwner.id,
          character_name: nextOwner.name,
          smurfs: remaining,
          updated_at: Timestamp.now(),
        })
      }
      transaction.delete(document.ref)
    }

    return next
  })

  invalidateRemarksCache()
  console.log('remark saved', JSON.stringify({ character: record.character_name, smurfs: record.smurfs.length }))
  return toRemark(record)
}

export async function deleteRemark(characterId: string): Promise<void> {
  await remarks.doc(characterId).delete()
  invalidateRemarksCache()
}
