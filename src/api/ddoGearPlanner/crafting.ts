import { fetchDatasetWithCache, GearPlannerCacheOptions, GearPlannerCacheResult, getDatasetMetadata } from './cache'
import { CRAFTING_JSON_URL } from './constants'
import { ItemAffix } from './items'

/**
 * A crafting option represents a choice that can be made for a crafting slot on an item.
 *
 * There are 7 possible field combinations:
 * - {affixes} - Simple affix-only options (e.g., "Almost There" crafting)
 * - {affixes, ml, name, quests} - Named augments with source quest and ML requirement
 * - {affixes, ml, name} - Named augments without quest source
 * - {name, set} - Set bonus selection only (no affixes directly)
 * - {affixes, ml, name, quests, set} - Set Augments that provide both affix AND set membership
 * - {set} - Pure set selection (e.g., Slaver's Set Bonus)
 * - {affixes, name} - Named affixes without ML (e.g., Slaver's slots)
 */
export interface CraftingOption {
  /** Augment/option name (e.g., "Sapphire of Accuracy +22") */
  name?: string
  /** Affixes provided by this option */
  affixes?: ItemAffix[]
  /** Where to obtain this option */
  quests?: string[]
  /** Minimum level requirement */
  ml?: number
  /** Set membership granted by this option (for Set Augments and set bonus slots) */
  set?: string
}

/**
 * Crafting data structure: [CraftingSlotType] -> [ItemName or "*"] -> CraftingOption[]
 *
 * The "*" key indicates universal options available for any item with this slot type.
 * Specific item names indicate options only available for that specific item.
 */
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
