const DDOAUDIT_BASE_URL = 'https://api.ddoaudit.com/v1'
const QUESTS_JSON_URL =
  'https://api.ddoaudit.com/v1/quests?force=false'
const AREAS_JSON_URL =
  'https://api.ddoaudit.com/v1/areas?force=false'

const MAX_CHARACTER_IDS_PER_REQUEST = 30

function chunk<T>(items: T[], size: number): T[][] {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, size | 0)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) out.push(items.slice(i, i + chunkSize))
  return out
}

const HOUR_IN_MS = 60 * 60 * 1000
// User-specified lockout duration: 2 days + 18 hours.
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * HOUR_IN_MS

export function normalizeCharacterId(value: string | number | null | undefined): string | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return null
  return text
}

export function parseCharacterIds(input: string | null | undefined): string[] {
  const parts = String(input ?? '')
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const unique = new Set<string>()
  for (const part of parts) {
    const normalized = normalizeCharacterId(part)
    if (normalized) unique.add(normalized)
  }
  return Array.from(unique)
}

export interface FetchOptions {
  signal?: AbortSignal
}

export async function fetchCharactersByIds(characterIds: string[], options: FetchOptions = {}): Promise<Record<string, any>> {
  if (!characterIds?.length) return {}

  const batches = chunk(characterIds, MAX_CHARACTER_IDS_PER_REQUEST)
  const results = await Promise.all(
    batches.map(async (batch) => {
      const url = `${DDOAUDIT_BASE_URL}/characters/ids/${batch.join(',')}`
      const resp = await fetch(url, { signal: options.signal })
      if (!resp.ok) {
        throw new Error(`Failed to fetch characters (${resp.status})`)
      }
      const json = await resp.json()
      return (json?.data ?? {}) as Record<string, any>
    }),
  )

  // Efficiently merge all result objects into one
  const merged: Record<string, any> = {};
  for (const obj of results) {
    Object.assign(merged, obj);
  }
  return merged;
}

export async function fetchRaidActivity(characterIds: string[], options: FetchOptions = {}): Promise<any[]> {
  if (!characterIds?.length) return []

  const batches = chunk(characterIds, MAX_CHARACTER_IDS_PER_REQUEST)
  const results = await Promise.all(
    batches.map(async (batch) => {
      const url = new URL(`${DDOAUDIT_BASE_URL}/activity/raids`)
      url.searchParams.set('character_ids', batch.join(','))

      const resp = await fetch(url, { signal: options.signal })
      if (!resp.ok) {
        throw new Error(`Failed to fetch raid activity (${resp.status})`)
      }
      const json = await resp.json()
      return (json?.data ?? []) as any[]
    }),
  )

  return results.flat()
}

/**
 * Fetch current LFM (Looking For More) listings for a server.
 */
export async function fetchLfms(serverName = 'shadowdale', options: FetchOptions = {}): Promise<Record<string, any>> {
  const server = String(serverName ?? '').trim() || 'shadowdale'
  const url = `${DDOAUDIT_BASE_URL}/lfms/${encodeURIComponent(server)}`
  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch LFMs (${resp.status})`)
  }
  const json = await resp.json()

  /**
   * Normalize possible response shapes into a record keyed by group id.
   * Some deployments return `{ data: { [id]: lfm } }` while others return `{ [id]: lfm }`.
   */
  const normalize = (value: any): Record<string, any> => {
    if (!value) return {}

    // Common wrapper: { data: ... }
    if (typeof value === 'object' && !Array.isArray(value) && value?.data) {
      return normalize(value.data)
    }

    // Sometimes: [ { id, quest_id, ... }, ... ]
    if (Array.isArray(value)) {
      const out: Record<string, any> = {}
      for (const item of value) {
        const id = item?.id ?? item?.group_id
        if (id === null || id === undefined) continue
        out[String(id)] = item
      }
      return out
    }

    // Already the expected record: { [id]: lfm }
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 1) {
        const onlyKey = keys[0]
        const nested = value?.[onlyKey]
        // If we got something like { data: { ... } } but under a different key name,
        // unwrap when the nested object looks like a record of LFMs.
        if (
          nested &&
          typeof nested === 'object' &&
          !Array.isArray(nested) &&
          !('quest_id' in value) &&
          !('id' in value) &&
          Object.values(nested).some((x) => x && typeof x === 'object' && 'quest_id' in x)
        ) {
          return nested
        }
      }
      return value
    }

    return {}
  }

  return normalize(json)
}

export interface Quest {
  id: string
  name: string
  type: string | null
  level: number | null
  heroicLevel: number | null
  epicLevel: number | null
  required_adventure_pack: string | null
  areaId: string | null
}

let questsByIdPromise: Promise<Record<string, Quest>> | null = null
let areasByIdPromise: Promise<Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>> | null = null

function parseNullableInt(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null') return null
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Quests are loaded from JSON and mapped into a simple lookup table keyed by quest id.
 * Returned values are normalized to the shape used by the UI.
 */
export async function fetchQuestsById(): Promise<Record<string, Quest>> {
  if (questsByIdPromise) return questsByIdPromise

  questsByIdPromise = (async () => {
    const resp = await fetch(QUESTS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch quests.json (${resp.status})`)
    }

    const data = await resp.json()
    const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

    const map: Record<string, Quest> = {}

    for (const q of list) {
      const name = String(q?.name ?? '').trim()
      const type = String(q?.group_size ?? '').trim()
      const heroicCr = parseNullableInt(q?.heroic_normal_cr)
      const epicCr = parseNullableInt(q?.epic_normal_cr)
      const level = heroicCr === null && epicCr === null ? null : Math.max(heroicCr ?? 0, epicCr ?? 0)
      const pack = String(q?.required_adventure_pack ?? '').trim() || null

      const primaryId = String(q?.id ?? '').trim()
      const altId = String(q?.alt_id ?? '').trim()
      const areaId = String(q?.area_id ?? '').trim()
      const ids = new Set([primaryId, altId, areaId].filter((x) => x && x.toLowerCase() !== 'null' && x !== '0'))

      if (!name || ids.size === 0) continue

      const questObj: Quest = {
        id: primaryId,
        name,
        type: type || null,
        level,
        heroicLevel: heroicCr,
        epicLevel: epicCr,
        required_adventure_pack: pack,
        areaId: areaId && areaId.toLowerCase() !== 'null' && areaId !== '0' ? areaId : null,
      }

      for (const id of ids) {
        map[id] = questObj
      }
    }

    return map
  })()

  return questsByIdPromise
}

/**
 * Areas are loaded from JSON and mapped into a simple lookup table keyed by area id.
 * Returned values are normalized to the shape used by the UI.
 */
export async function fetchAreasById(): Promise<Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>> {
  if (areasByIdPromise) return areasByIdPromise

  areasByIdPromise = (async () => {
    const resp = await fetch(AREAS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch areas.json (${resp.status})`)
    }

    const data = await resp.json()
    const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

    const map: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }> = {}

    for (const a of list) {
      const id = String(a?.id ?? '').trim()
      const name = String(a?.name ?? '').trim()
      if (!id || id.toLowerCase() === 'null' || id === '0') continue
      if (!name) continue
      map[id] = {
        id,
        name,
        is_public: !!a?.is_public,
        is_wilderness: !!a?.is_wilderness,
      }
    }

    return map
  })()

  return areasByIdPromise
}

export function formatLocalDateTime(ts: string | number | Date | null | undefined, options: { includeSeconds?: boolean } = {}): string {
  if (ts === null || ts === undefined || ts === '') return '—'
  const d = ts instanceof Date ? ts : new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  const includeSeconds = options?.includeSeconds === true
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  })
}

export function addMs(ts: string | number | Date | null | undefined, ms: number): Date | null {
  if (ts === null || ts === undefined || ts === '') return null
  const d = ts instanceof Date ? ts : new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() + ms)
}

export function formatReadyAt(ts: string | number | Date | null | undefined): string {
  const ready = addMs(ts, RAID_LOCKOUT_MS)
  if (!ready) return '—'
  return formatLocalDateTime(ready)
}

export function formatAge(ts: string | number | Date | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '—'
  const d = ts instanceof Date ? ts : new Date(ts)
  const ms = Date.now() - d.getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const minutes = totalMinutes - days * 60 * 24 - hours * 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatTimeRemaining(remainingMs: number): string {
  if (!Number.isFinite(remainingMs)) return 'Available'
  if (remainingMs <= 0) return 'Ready'

  const totalMinutes = Math.ceil(remainingMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const minutes = totalMinutes - days * 60 * 24 - hours * 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
