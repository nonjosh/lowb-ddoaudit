import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import { combineAffixes, getPropertyTotal } from './affixStacking'
import {
  autoSelectCraftingOptions,
  autoSelectCraftingOptionsForGearSetup,
  countAugmentSlots,
  getCraftingAffixes,
  getCraftingSetMemberships,
  GearCraftingSelections
} from './craftingHelpers'
import { getGearAffixes, GearSetup, GEAR_SLOTS, getItemsBySlot, getSlotKey } from './gearSetup'

/**
 * Result of gear optimization with score
 */
export interface OptimizedGearSetup {
  setup: GearSetup
  score: number
  propertyValues: Map<string, number>
  unusedAugments?: number
  totalAugments?: number
  extraProperties?: number
  otherEffects?: string[]
  /** Crafting selections for each slot */
  craftingSelections?: GearCraftingSelections
}

/**
 * Options for gear optimization
 */
export interface OptimizationOptions {
  /** Properties to optimize for (e.g., ["Strength", "Constitution", "Doublestrike"]) */
  properties: string[]
  /** Maximum number of results to return */
  maxResults?: number
  /** Minimum ML to consider */
  minML?: number
  /** Maximum ML to consider */
  maxML?: number
  /** Crafting data for augment optimization */
  craftingData?: CraftingData | null
}

/**
 * Calculates the score for a gear setup based on selected properties
 * Also calculates unused augment slots and extra properties
 */
export function calculateScore(
  setup: GearSetup,
  properties: string[],
  setsData: SetsData | null,
  craftingData?: CraftingData | null
): {
  score: number
  propertyValues: Map<string, number>
  unusedAugments: number
  totalAugments: number
  extraProperties: number
  otherEffects: string[]
  craftingSelections: GearCraftingSelections
} {
  const slotKeys: (keyof GearSetup)[] = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Get base affixes from gear first (without crafting) to know what's already covered
  const baseAffixes = getGearAffixes(setup, setsData, [])

  // Auto-select crafting options for entire gear setup, respecting stacking rules
  const gearSetupRecord: Record<string, Item | undefined> = {}
  for (const slotKey of slotKeys) {
    gearSetupRecord[slotKey] = setup[slotKey]
  }

  const craftingSelections = autoSelectCraftingOptionsForGearSetup(
    gearSetupRecord,
    craftingData ?? null,
    properties,
    baseAffixes
  )

  // Collect set memberships from crafting (e.g., Set Augments)
  const additionalSetMemberships: string[] = []
  for (const slotKey of slotKeys) {
    const selections = craftingSelections[slotKey] || []
    additionalSetMemberships.push(...getCraftingSetMemberships(selections))
  }

  // Re-calculate base affixes with additional set memberships
  const baseAffixesWithSets = getGearAffixes(setup, setsData, additionalSetMemberships)

  // Collect crafting affixes
  const allCraftingAffixes = Object.values(craftingSelections).flatMap(selections =>
    getCraftingAffixes(selections)
  )

  // Combine all affixes
  const allAffixes = [...baseAffixesWithSets, ...allCraftingAffixes]
  const combined = combineAffixes(allAffixes)

  let score = 0
  const propertyValues = new Map<string, number>()

  // Calculate score based on property order (first property is most important)
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const value = getPropertyTotal(combined, property)
    propertyValues.set(property, value)
    // Weight by position: first property gets full weight, decreasing for later properties
    const weight = properties.length - i
    score += value * weight
  }

  // Count augment slots
  let totalAugmentSlots = 0
  let usedAugmentSlots = 0

  for (const slotKey of slotKeys) {
    const item = setup[slotKey]
    if (item) {
      const selections = craftingSelections[slotKey] || []
      const { total, used } = countAugmentSlots(item, selections, properties)
      totalAugmentSlots += total
      usedAugmentSlots += used
    }
  }

  // Get other effects (properties not in the selected list)
  const allProperties = Array.from(combined.keys())
  const otherEffects = allProperties.filter(p => !properties.includes(p)).sort()
  const extraProperties = otherEffects.length

  const unusedAugments = totalAugmentSlots - usedAugmentSlots

  return {
    score,
    propertyValues,
    unusedAugments,
    totalAugments: totalAugmentSlots,
    extraProperties,
    otherEffects,
    craftingSelections
  }
}

/**
 * Generates optimized gear setups
 * This is a simplified greedy algorithm - selects best item for each slot
 */
export function optimizeGear(
  items: Item[],
  setsData: SetsData | null,
  options: OptimizationOptions
): OptimizedGearSetup[] {
  const { properties, maxResults = 10, minML = 1, maxML = 34, craftingData } = options

  // Filter items by ML range
  const filteredItems = items.filter(item => item.ml >= minML && item.ml <= maxML)

  // For each slot, get top items that provide the selected properties
  const slotItems = new Map<string, Item[]>()

  for (const slot of GEAR_SLOTS) {
    const itemsForSlot = getItemsBySlot(filteredItems, slot)

    // Score each item based on how much it contributes to selected properties
    // Include crafting contributions in the score
    const scoredItems = itemsForSlot.map(item => {
      const combined = combineAffixes(item.affixes)

      // Also consider crafting options when scoring
      let craftingScore = 0
      if (craftingData && item.crafting) {
        const selections = autoSelectCraftingOptions(item, craftingData, properties)
        const craftingAffixes = getCraftingAffixes(selections)
        const craftingCombined = combineAffixes(craftingAffixes)
        for (const property of properties) {
          craftingScore += getPropertyTotal(craftingCombined, property)
        }
      }

      let itemScore = 0
      for (const property of properties) {
        itemScore += getPropertyTotal(combined, property)
      }
      return { item, score: itemScore + craftingScore }
    })

    // Keep top items for this slot
    const topItems = scoredItems
      .filter(si => si.score > 0) // Only keep items that contribute
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Keep top 20 per slot
      .map(si => si.item)

    slotItems.set(slot, topItems)
  }

  // Generate gear combinations
  // For simplicity, we'll generate combinations by selecting best items per slot
  // A more sophisticated algorithm would consider set bonuses and interactions
  const results: OptimizedGearSetup[] = []

  // Generate base setup with top item per slot
  const baseSetup: GearSetup = {}

  for (const slot of GEAR_SLOTS) {
    const items = slotItems.get(slot) || []
    if (items.length > 0) {
      if (slot === 'Ring') {
        baseSetup.ring1 = items[0]
        if (items.length > 1) {
          baseSetup.ring2 = items[1]
        }
      } else {
        const key = getSlotKey(slot)
        baseSetup[key] = items[0]
      }
    }
  }

  const baseResult = calculateScore(baseSetup, properties, setsData, craftingData)
  results.push({
    setup: baseSetup,
    score: baseResult.score,
    propertyValues: baseResult.propertyValues,
    unusedAugments: baseResult.unusedAugments,
    totalAugments: baseResult.totalAugments,
    extraProperties: baseResult.extraProperties,
    otherEffects: baseResult.otherEffects,
    craftingSelections: baseResult.craftingSelections
  })

  // Generate alternative setups by swapping items
  // Try swapping each slot with its second-best option
  for (const slot of GEAR_SLOTS) {
    const items = slotItems.get(slot) || []
    if (items.length < 2) continue

    for (let i = 1; i < Math.min(items.length, 3); i++) {
      const altSetup = { ...baseSetup }

      if (slot === 'Ring') {
        altSetup.ring1 = items[i]
      } else {
        const key = getSlotKey(slot)
        altSetup[key] = items[i]
      }

      const result = calculateScore(altSetup, properties, setsData, craftingData)
      results.push({
        setup: altSetup,
        score: result.score,
        propertyValues: result.propertyValues,
        unusedAugments: result.unusedAugments,
        totalAugments: result.totalAugments,
        extraProperties: result.extraProperties,
        otherEffects: result.otherEffects,
        craftingSelections: result.craftingSelections
      })
    }
  }

  // Sort by unused augments (descending), then by extra properties (descending), then by score
  return results
    .sort((a, b) => {
      // First sort by unused augments (more is better)
      if ((b.unusedAugments || 0) !== (a.unusedAugments || 0)) {
        return (b.unusedAugments || 0) - (a.unusedAugments || 0)
      }
      // Then by extra properties (more is better)
      if ((b.extraProperties || 0) !== (a.extraProperties || 0)) {
        return (b.extraProperties || 0) - (a.extraProperties || 0)
      }
      // Finally by score
      return b.score - a.score
    })
    .slice(0, maxResults)
}

/**
 * Gets all unique property names from items
 */
export function getAllAvailableProperties(items: Item[]): string[] {
  const propertySet = new Set<string>()

  for (const item of items) {
    for (const affix of item.affixes) {
      if (affix.type !== 'bool') {
        propertySet.add(affix.name)
      }
    }
  }

  return Array.from(propertySet).sort()
}
