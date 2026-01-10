import {
  gearPlannerDb,
  GearPlannerDatasetKey,
  GearPlannerDatasetRecord,
  GEAR_PLANNER_CACHE_TTL_MS
} from '@/storage/gearPlannerDb'

export interface GearPlannerCacheOptions {
  forceRefresh?: boolean
  ttlMs?: number
}

export interface GearPlannerCacheResult<TData> {
  data: TData
  updatedAt: number | null
  fromCache: boolean
  stale: boolean
}

const inFlightRequests = new Map<GearPlannerDatasetKey, Promise<GearPlannerCacheResult<unknown>>>()

export async function fetchDatasetWithCache<TData>(
  key: GearPlannerDatasetKey,
  request: () => Promise<TData>,
  options: GearPlannerCacheOptions = {}
): Promise<GearPlannerCacheResult<TData>> {
  const { forceRefresh = false, ttlMs = GEAR_PLANNER_CACHE_TTL_MS } = options
  const cachedRecord = await gearPlannerDb.datasets.get(key) as GearPlannerDatasetRecord<TData> | undefined

  if (!forceRefresh && cachedRecord) {
    const age = Date.now() - cachedRecord.updatedAt
    if (age <= ttlMs) {
      return {
        data: cachedRecord.data,
        updatedAt: cachedRecord.updatedAt,
        fromCache: true,
        stale: false
      }
    }
  }

  if (!forceRefresh) {
    const existing = inFlightRequests.get(key)
    if (existing) {
      return existing as Promise<GearPlannerCacheResult<TData>>
    }
  }

  const fetchPromise = (async (): Promise<GearPlannerCacheResult<TData>> => {
    try {
      const data = await request()
      const updatedAt = Date.now()
      await gearPlannerDb.datasets.put({ key, data, updatedAt })

      return { data, updatedAt, fromCache: false, stale: false }
    } catch (error) {
      if (cachedRecord) {
        return {
          data: cachedRecord.data,
          updatedAt: cachedRecord.updatedAt,
          fromCache: true,
          stale: true
        }
      }
      throw error
    }
  })()

  inFlightRequests.set(key, fetchPromise as Promise<GearPlannerCacheResult<unknown>>)
  try {
    return await fetchPromise
  } finally {
    inFlightRequests.delete(key)
  }
}

export async function getDatasetMetadata(key: GearPlannerDatasetKey) {
  const record = await gearPlannerDb.datasets.get(key)
  if (!record) return null

  return { updatedAt: record.updatedAt }
}

export async function clearDataset(key: GearPlannerDatasetKey) {
  await gearPlannerDb.datasets.delete(key)
}
