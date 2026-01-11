import { Item, SetsData } from '@/api/ddoGearPlanner'
import { combineAffixes, getPropertyTotal } from './affixStacking'
import { getGearAffixes, GearSetup, GEAR_SLOTS, getItemsBySlot, getSlotKey } from './gearSetup'

/**
 * Result of gear optimization with score
 */
export interface OptimizedGearSetup {
  setup: GearSetup
  score: number
  propertyValues: Map<string, number>
  unusedAugments?: number
  extraProperties?: number
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
}

/**
 * Calculates the score for a gear setup based on selected properties
 * Also calculates unused augment slots and extra properties
 */
export function calculateScore(
  setup: GearSetup,
  properties: string[],
  setsData: SetsData | null
): { score: number; propertyValues: Map<string, number>; unusedAugments: number; extraProperties: number } {
  const affixes = getGearAffixes(setup, setsData)
  const combined = combineAffixes(affixes)
  
  let score = 0
  const propertyValues = new Map<string, number>()
  
  for (const property of properties) {
    const value = getPropertyTotal(combined, property)
    propertyValues.set(property, value)
    score += value
  }
  
  // Count augment slots
  let totalAugmentSlots = 0
  let usedAugmentSlots = 0
  
  // Count extra properties (properties not in the selected list)
  let extraProperties = 0
  const allProperties = Array.from(combined.keys())
  extraProperties = allProperties.filter(p => !properties.includes(p)).length
  
  // TODO: Actually count augment slots from items
  // For now, estimate based on ML and slot type
  const slots: (keyof GearSetup)[] = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']
  for (const slot of slots) {
    const item = setup[slot]
    if (item) {
      // Count augment slot affixes
      const augmentAffixes = item.affixes.filter(a => 
        a.name.toLowerCase().includes('augment slot')
      )
      totalAugmentSlots += augmentAffixes.length
      
      // For simplicity, assume no augments are used yet
      // In a full implementation, we'd track which augments are slotted
    }
  }
  
  const unusedAugments = totalAugmentSlots - usedAugmentSlots
  
  return { score, propertyValues, unusedAugments, extraProperties }
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
  const { properties, maxResults = 10, minML = 1, maxML = 34 } = options

  // Filter items by ML range
  const filteredItems = items.filter(item => item.ml >= minML && item.ml <= maxML)

  // For each slot, get top items that provide the selected properties
  const slotItems = new Map<string, Item[]>()
  
  for (const slot of GEAR_SLOTS) {
    const itemsForSlot = getItemsBySlot(filteredItems, slot)
    
    // Score each item based on how much it contributes to selected properties
    const scoredItems = itemsForSlot.map(item => {
      const combined = combineAffixes(item.affixes)
      let itemScore = 0
      for (const property of properties) {
        itemScore += getPropertyTotal(combined, property)
      }
      return { item, score: itemScore }
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

  const { score, propertyValues, unusedAugments, extraProperties } = calculateScore(baseSetup, properties, setsData)
  results.push({ setup: baseSetup, score, propertyValues, unusedAugments, extraProperties })

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

      const result = calculateScore(altSetup, properties, setsData)
      results.push({ 
        setup: altSetup, 
        score: result.score, 
        propertyValues: result.propertyValues,
        unusedAugments: result.unusedAugments,
        extraProperties: result.extraProperties
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
