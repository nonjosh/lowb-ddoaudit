import { fetchDatasetWithCache, GearPlannerCacheOptions, GearPlannerCacheResult, getDatasetMetadata } from './cache'
import { ITEMS_JSON_URL } from './constants'

export interface ItemAffix {
  name: string
  type: string
  value: string | number
}

export interface Item {
  name: string
  ml: number
  quests?: string[]
  slot: string
  type?: string
  affixes: ItemAffix[]
  crafting?: string[]
  url?: string
  sets?: string[]
  artifact?: boolean
}

const DATASET_KEY = 'items'

async function requestItems(): Promise<Item[]> {
  const resp = await fetch(ITEMS_JSON_URL)
  if (!resp.ok) {
    throw new Error(`Failed to fetch items.json (${resp.status})`)
  }

  const data = await resp.json()
  return Array.isArray(data) ? data : []
}

export async function fetchItems(options?: GearPlannerCacheOptions): Promise<Item[]> {
  const result = await fetchItemsWithMetadata(options)
  return result.data
}

export async function fetchItemsWithMetadata(options?: GearPlannerCacheOptions): Promise<GearPlannerCacheResult<Item[]>> {
  return fetchDatasetWithCache<Item[]>(DATASET_KEY, requestItems, options)
}

export async function getItemsCacheMetadata() {
  return getDatasetMetadata(DATASET_KEY)
}
