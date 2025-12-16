const DDOAUDIT_BASE_URL = 'https://api.ddoaudit.com/v1'
const QUESTS_JSON_URL =
  'https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/quests.json'

const MAX_CHARACTER_IDS_PER_REQUEST = 30

/**
 * @template T
 * @param {T[]} items
 * @param {number} size
 */
function chunk(items, size) {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, size | 0)
  /** @type {T[][]} */
  const out = []
  for (let i = 0; i < items.length; i += chunkSize) out.push(items.slice(i, i + chunkSize))
  return out
}

// User-specified lockout duration.
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * 60 * 60 * 1000

/**
 * @param {string | number} value
 */
export function normalizeCharacterId(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return null
  return text
}

/**
 * @param {string} input
 */
export function parseCharacterIds(input) {
  const parts = String(input ?? '')
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const unique = new Set()
  for (const part of parts) {
    const normalized = normalizeCharacterId(part)
    if (normalized) unique.add(normalized)
  }
  return Array.from(unique)
}

/**
 * @param {string[]} characterIds
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchCharactersByIds(characterIds, options = {}) {
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
      return json?.data ?? {}
    }),
  )

  // Efficiently merge all result objects into one
  const merged = {};
  for (const obj of results) {
    Object.assign(merged, obj);
  }
  return merged;
}

/**
 * @param {string[]} characterIds
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchRaidActivity(characterIds, options = {}) {
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
      return json?.data ?? []
    }),
  )

  return results.flat()
}

let questsByIdPromise = null

function parseNullableInt(value) {
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
export async function fetchQuestsById() {
  if (questsByIdPromise) return questsByIdPromise

  questsByIdPromise = (async () => {
    const resp = await fetch(QUESTS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch quests.json (${resp.status})`)
    }

    const data = await resp.json()
    const list = Array.isArray(data) ? data : []

    /** @type {Record<string, { id: string, name: string, type: string | null, level: number | null }> } */
    const map = {}

    for (const q of list) {
      const name = String(q?.name ?? '').trim()
      const type = String(q?.group_size ?? '').trim()
      const heroicCr = parseNullableInt(q?.heroic_normal_cr)
      const epicCr = parseNullableInt(q?.epic_normal_cr)
      const level = heroicCr === null && epicCr === null ? null : Math.max(heroicCr ?? 0, epicCr ?? 0)

      const primaryId = String(q?.id ?? '').trim()
      const altId = String(q?.alt_id ?? '').trim()
      const ids = new Set([primaryId, altId].filter((x) => x && x.toLowerCase() !== 'null'))

      if (!name || ids.size === 0) continue
      for (const id of ids) {
        map[id] = { id, name, type: type || null, level }
      }
    }

    return map
  })()

  return questsByIdPromise
}

/**
 * @param {string | number | Date} ts
 */
export function formatLocalDateTime(ts) {
  if (ts === null || ts === undefined || ts === '') return '—'
  const d = ts instanceof Date ? ts : new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @param {string | number | Date} ts
 * @param {number} ms
 */
export function addMs(ts, ms) {
  if (ts === null || ts === undefined || ts === '') return null
  const d = ts instanceof Date ? ts : new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() + ms)
}

/**
 * @param {string | number | Date} ts
 */
export function formatReadyAt(ts) {
  const ready = addMs(ts, RAID_LOCKOUT_MS)
  if (!ready) return '—'
  return formatLocalDateTime(ready)
}

/**
 * @param {string | number | Date} ts
 */
export function formatAge(ts) {
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

/**
 * @param {number} remainingMs
 */
export function formatTimeRemaining(remainingMs) {
  if (!Number.isFinite(remainingMs)) return 'Available ✅'
  if (remainingMs <= 0) return 'Ready'

  const totalMinutes = Math.ceil(remainingMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const minutes = totalMinutes - days * 60 * 24 - hours * 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
