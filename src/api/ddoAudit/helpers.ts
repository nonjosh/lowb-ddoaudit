import { RAID_LOCKOUT_MS } from './constants'

export function chunk<T>(items: T[], size: number): T[][] {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, size | 0)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) out.push(items.slice(i, i + chunkSize))
  return out
}

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

export function parseNullableInt(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null') return null
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? n : null
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
