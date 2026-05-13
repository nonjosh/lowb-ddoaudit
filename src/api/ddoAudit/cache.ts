import { DDOAUDIT_JSON_CACHE_TTL_MS } from './constants'

export interface DdoAuditCacheOptions {
  forceRefresh?: boolean
  ttlMs?: number
}

export interface DdoAuditCacheResult<TData> {
  data: TData
  updatedAt: number | null
  fromCache: boolean
  stale: boolean
}

interface DdoAuditCacheRecord<TData> {
  data: TData
  updatedAt: number
}

const inFlightRequests = new Map<string, Promise<DdoAuditCacheResult<unknown>>>()

function readCachedRecord<TData>(key: string): DdoAuditCacheRecord<TData> | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<DdoAuditCacheRecord<TData>>
    if (parsed.updatedAt === undefined || parsed.updatedAt === null || parsed.data === undefined) {
      localStorage.removeItem(key)
      return null
    }

    if (typeof parsed.updatedAt !== 'number' || !Number.isFinite(parsed.updatedAt)) {
      localStorage.removeItem(key)
      return null
    }

    return {
      data: parsed.data,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function writeCachedRecord<TData>(key: string, data: TData, updatedAt: number) {
  if (typeof localStorage === 'undefined') return

  localStorage.setItem(key, JSON.stringify({ data, updatedAt }))
}

export async function fetchJsonWithCache<TData>(
  key: string,
  request: () => Promise<TData>,
  options: DdoAuditCacheOptions = {}
): Promise<DdoAuditCacheResult<TData>> {
  const { forceRefresh = false, ttlMs = DDOAUDIT_JSON_CACHE_TTL_MS } = options
  const cachedRecord = forceRefresh ? null : readCachedRecord<TData>(key)

  if (cachedRecord) {
    const age = Date.now() - cachedRecord.updatedAt
    if (age <= ttlMs) {
      return {
        data: cachedRecord.data,
        updatedAt: cachedRecord.updatedAt,
        fromCache: true,
        stale: false,
      }
    }
  }

  if (!forceRefresh) {
    const existing = inFlightRequests.get(key)
    if (existing) {
      return existing as Promise<DdoAuditCacheResult<TData>>
    }
  }

  const fetchPromise = (async (): Promise<DdoAuditCacheResult<TData>> => {
    try {
      const data = await request()
      const updatedAt = Date.now()
      writeCachedRecord(key, data, updatedAt)

      return {
        data,
        updatedAt,
        fromCache: false,
        stale: false,
      }
    } catch (error) {
      if (cachedRecord) {
        return {
          data: cachedRecord.data,
          updatedAt: cachedRecord.updatedAt,
          fromCache: true,
          stale: true,
        }
      }

      throw error
    }
  })()

  inFlightRequests.set(key, fetchPromise as Promise<DdoAuditCacheResult<unknown>>)
  try {
    return await fetchPromise
  } finally {
    inFlightRequests.delete(key)
  }
}