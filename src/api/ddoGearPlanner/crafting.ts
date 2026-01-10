import { fetchDatasetWithCache, GearPlannerCacheOptions, GearPlannerCacheResult, getDatasetMetadata } from './cache'
import { CRAFTING_JSON_URL } from './constants'
import { ItemAffix } from './items'

export interface CraftingOption {
  name?: string
  affixes?: ItemAffix[]
  quests?: string[]
  ml?: number
}

export type CraftingData = Record<string, Record<string, CraftingOption[]>>

const DATASET_KEY = 'crafting'

async function requestCrafting(): Promise<CraftingData> {
  const resp = await fetch(CRAFTING_JSON_URL)
  if (!resp.ok) {
    throw new Error(`Failed to fetch crafting.json (${resp.status})`)
  }

  return await resp.json() as CraftingData
}

export async function fetchCrafting(options?: GearPlannerCacheOptions): Promise<CraftingData> {
  const result = await fetchCraftingWithMetadata(options)
  return result.data
}

export async function fetchCraftingWithMetadata(options?: GearPlannerCacheOptions): Promise<GearPlannerCacheResult<CraftingData>> {
  return fetchDatasetWithCache<CraftingData>(DATASET_KEY, requestCrafting, options)
}

export async function getCraftingCacheMetadata() {
  return getDatasetMetadata(DATASET_KEY)
}
