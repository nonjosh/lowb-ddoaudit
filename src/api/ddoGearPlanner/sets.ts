import { fetchDatasetWithCache, GearPlannerCacheOptions, GearPlannerCacheResult, getDatasetMetadata } from './cache'
import { SETS_JSON_URL } from './constants'
import { ItemAffix } from './items'

export interface SetBonus {
  threshold: number
  affixes: ItemAffix[]
}

export type SetsData = Record<string, SetBonus[]>

const DATASET_KEY = 'sets'

async function requestSets(): Promise<SetsData> {
  const resp = await fetch(SETS_JSON_URL)
  if (!resp.ok) {
    throw new Error(`Failed to fetch sets.json (${resp.status})`)
  }

  return await resp.json() as SetsData
}

export async function fetchSets(options?: GearPlannerCacheOptions): Promise<SetsData> {
  const result = await fetchSetsWithMetadata(options)
  return result.data
}

export async function fetchSetsWithMetadata(options?: GearPlannerCacheOptions): Promise<GearPlannerCacheResult<SetsData>> {
  return fetchDatasetWithCache<SetsData>(DATASET_KEY, requestSets, options)
}

export async function getSetsCacheMetadata() {
  return getDatasetMetadata(DATASET_KEY)
}
