import Papa from 'papaparse'

const DDOAUDIT_BASE_URL = 'https://api.ddoaudit.com/v1'
const QUESTS_CSV_URL =
  'https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/quests.csv'

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
  const url = `${DDOAUDIT_BASE_URL}/characters/ids/${characterIds.join(',')}`
  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch characters (${resp.status})`)
  }
  const json = await resp.json()
  return json?.data ?? {}
}

/**
 * @param {string[]} characterIds
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchRaidActivity(characterIds, options = {}) {
  if (!characterIds?.length) return []
  const url = new URL(`${DDOAUDIT_BASE_URL}/activity/raids`)
  url.searchParams.set('character_ids', characterIds.join(','))

  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch raid activity (${resp.status})`)
  }
  const json = await resp.json()
  return json?.data ?? []
}

let questsByIdPromise = null

function parseNullableInt(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null') return null
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Quests CSV rows contain quoted fields with embedded newlines, so a real CSV parser is required.
 * We only rely on:
 * - col[0] => quest id
 * - col[2] => quest name
 * - col[3] => heroic level
 * - col[4] => epic/legendary level
 * - col[9] => quest type ("Raid", "Party", ...)
 */
export async function fetchQuestsById() {
  if (questsByIdPromise) return questsByIdPromise

  questsByIdPromise = (async () => {
    const resp = await fetch(QUESTS_CSV_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch quests.csv (${resp.status})`)
    }
    const csvText = await resp.text()

    const parsed = Papa.parse(csvText, {
      skipEmptyLines: true,
    })

    if (parsed.errors?.length) {
      const first = parsed.errors[0]
      throw new Error(`Failed to parse quests.csv: ${first.message}`)
    }

    /** @type {Record<string, { id: string, name: string, type: string | null, level: number | null }> } */
    const map = {}
    for (const row of parsed.data ?? []) {
      if (!Array.isArray(row)) continue
      const id = String(row[0] ?? '').trim()
      const name = String(row[2] ?? '').trim()
      const heroicLevel = parseNullableInt(row[3])
      const epicLevel = parseNullableInt(row[4])
      const level = heroicLevel === null && epicLevel === null ? null : Math.max(heroicLevel ?? 0, epicLevel ?? 0)
      const type = row.length > 9 ? String(row[9] ?? '').trim() : ''
      if (!id || !name) continue
      map[id] = { id, name, type: type || null, level }
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
