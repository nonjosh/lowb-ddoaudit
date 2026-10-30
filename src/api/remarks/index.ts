import { WritePasswordRejectedError } from '@/api/adventureLog'
import { ADVENTURE_LOG_API_URL } from '@/api/adventureLog/constants'

/**
 * Shared player notes. One note per real player, keyed by the DDO Audit character id of
 * its owner; `smurfs` lists every character of that player with its id, so fresh data
 * (level, classes, last online) can be fetched in one bulk request.
 */

export type RemarkVerdict = 'good' | 'info' | 'avoid'

export interface RemarkClass {
  name: string
  level: number
}

export interface RemarkSmurf {
  /** DDO Audit character id; null for a name the API does not know. */
  id: string | null
  name: string
}

export interface CharacterRemark {
  characterId: string
  characterName: string
  verdict: RemarkVerdict
  note: string
  /** Snapshot at save time, so an offline character still shows level and classes. */
  level: number | null
  classes: RemarkClass[]
  /** Includes the owner. */
  smurfs: RemarkSmurf[]
  updatedAt: string
}

export interface RemarkInput {
  characterId: string
  characterName: string
  verdict: RemarkVerdict
  note: string
  level: number | null
  classes: RemarkClass[]
  smurfs: RemarkSmurf[]
}

export function remarkKey(name: string): string {
  return name.trim().toLowerCase()
}

const headers = (password: string) => ({ 'content-type': 'application/json', 'x-log-password': password })

/** A hung request must not leave the editor's Save disabled forever. */
const REQUEST_TIMEOUT_MS = 15_000

/**
 * True once the dev fallback has been used, so the UI can say the notes are not on the
 * server. Never true in a production build.
 */
let devStoreUsed = false
export function isUsingDevStore(): boolean {
  return devStoreUsed
}

export async function fetchRemarks(password: string): Promise<CharacterRemark[]> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/remarks`, {
    headers: { 'x-log-password': password },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (response.status === 401) throw new WritePasswordRejectedError()
  // Dev-only fallback: lets the UI be reviewed with `npm run dev` before the route is
  // deployed. Production never silently stores notes in the browser.
  if (response.status === 404 && import.meta.env.DEV) {
    devStoreUsed = true
    return readDevStore()
  }
  if (!response.ok) throw new Error(`Failed to fetch notes (${response.status})`)

  const body = (await response.json()) as { data?: CharacterRemark[] }
  return Array.isArray(body.data) ? body.data : []
}

export async function saveRemark(input: RemarkInput, password: string): Promise<CharacterRemark> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/remarks/${encodeURIComponent(input.characterId)}`, {
    method: 'PUT',
    headers: headers(password),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      characterName: input.characterName,
      verdict: input.verdict,
      note: input.note,
      level: input.level,
      classes: input.classes,
      smurfs: input.smurfs,
    }),
  })

  if (response.status === 401) throw new WritePasswordRejectedError()
  if (response.status === 404 && import.meta.env.DEV) {
    devStoreUsed = true
    return writeDevStore(input)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Failed to save the note (${response.status})`)
  }

  const body = (await response.json()) as { data?: CharacterRemark }
  if (!body.data) throw new Error('The server did not return the saved note')
  return body.data
}

export async function deleteRemark(characterId: string, password: string): Promise<void> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/remarks/${encodeURIComponent(characterId)}`, {
    method: 'DELETE',
    headers: { 'x-log-password': password },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (response.status === 401) throw new WritePasswordRejectedError()
  if (response.status === 404 && import.meta.env.DEV) {
    devStoreUsed = true
    deleteDevStore(characterId)
    return
  }
  if (!response.ok) throw new Error(`Failed to delete the note (${response.status})`)
}

/* ------------------------------------------------------------------ *
 * Dev-only store. Mirrors the server's rule that a character belongs  *
 * to one note, so the UI behaves the same way while reviewing.        *
 * ------------------------------------------------------------------ */

const DEV_STORE_KEY = 'lowb-remarks-dev-v2'

function readDevStore(): CharacterRemark[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DEV_STORE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as CharacterRemark[]) : []
  } catch {
    return []
  }
}

function storeDevNotes(notes: CharacterRemark[]): void {
  try {
    localStorage.setItem(DEV_STORE_KEY, JSON.stringify(notes))
  } catch {
    // Non-fatal: the note stays in memory for this session.
  }
}

function applyDevWrite(saved: CharacterRemark | null, droppedId: string): void {
  const takenIds = new Set((saved?.smurfs ?? []).map((smurf) => smurf.id).filter((id): id is string => Boolean(id)))
  const takenNames = new Set((saved?.smurfs ?? []).map((smurf) => remarkKey(smurf.name)))

  const others = readDevStore()
    .filter((note) => note.characterId !== droppedId)
    .map((note) => ({
      ...note,
      smurfs: note.smurfs.filter((smurf) =>
        smurf.id ? !takenIds.has(smurf.id) : !takenNames.has(remarkKey(smurf.name)),
      ),
    }))
    .filter((note) => note.smurfs.length > 0)
    .map((note) => {
      const owner = note.smurfs.find((smurf) => smurf.id) ?? note.smurfs[0]
      return { ...note, characterId: owner.id ?? note.characterId, characterName: owner.name }
    })

  storeDevNotes(saved ? [...others, saved] : others)
}

function writeDevStore(input: RemarkInput): CharacterRemark {
  const saved: CharacterRemark = { ...input, updatedAt: new Date().toISOString() }
  applyDevWrite(saved, input.characterId)
  return saved
}

function deleteDevStore(characterId: string): void {
  applyDevWrite(null, characterId)
}
