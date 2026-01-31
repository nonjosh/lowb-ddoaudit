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
 * Count how many minor artifacts are in a gear setup
 * DDO rules: Only 1 minor artifact can be worn at a time
 */
function countMinorArtifacts(setup: GearSetup): number {
  const slots: (keyof GearSetup)[] = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']
  return slots.filter(slot => setup[slot]?.artifact === true).length
}

/**
 * Check if adding an item would violate the minor artifact limit
 */
function wouldViolateArtifactLimit(setup: GearSetup, newItem: Item, slot: string): boolean {
  if (!newItem.artifact) return false // Not an artifact, no problem

  // Count current artifacts excluding the slot we're replacing
  const currentCount = countMinorArtifacts(setup)
  const slotKey = slot as keyof GearSetup
  const replacingArtifact = setup[slotKey]?.artifact === true

  // If we're replacing an artifact with an artifact, count stays same
  if (replacingArtifact) return false

  // If we're adding an artifact, check if we'd exceed limit
  return currentCount >= 1
}

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
  /** Number of sets with active bonuses */
  activeSets?: number
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
  /** Optional filter function to exclude items (e.g., filter to available items only) */
  itemFilter?: (item: Item) => boolean
  /** Armor type to filter by (Any, Cloth, Light, Medium, Heavy) */
  armorType?: string
  /** Whether to exclude set augments from optimization */
  excludeSetAugments?: boolean
  /** Whether to require at least one minor artifact in the setup */
  mustIncludeArtifact?: boolean
  /** Pinned gear setup - these items will be kept fixed */
  pinnedGear?: GearSetup
  /** Augment names to exclude from crafting optimization */
  excludedAugments?: string[]
  /** Adventure pack names to exclude (filters augments by their source quests) */
  excludedPacks?: string[]
}

/**
 * Calculates the score for a gear setup based on selected properties
 * Also calculates unused augment slots and extra properties
 */
export function calculateScore(
  setup: GearSetup,
  properties: string[],
  setsData: SetsData | null,
  craftingData?: CraftingData | null,
  excludeSetAugments = false,
  excludedAugments: string[] = [],
  excludedPacks: string[] = []
): {
  score: number
  propertyValues: Map<string, number>
  unusedAugments: number
  totalAugments: number
  extraProperties: number
  otherEffects: string[]
  activeSets: number
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
    baseAffixes,
    setsData,
    excludeSetAugments,
    excludedAugments,
    excludedPacks
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

  // Count active sets
  let activeSets = 0
  if (setsData) {
    const setItemCounts = new Map<string, number>()
    // Count set items from gear
    for (const slotKey of slotKeys) {
      const item = setup[slotKey]
      if (item?.sets) {
        for (const setName of item.sets) {
          setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
        }
      }
    }
    // Add set memberships from crafting
    for (const setName of additionalSetMemberships) {
      setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
    }
    // Count sets that have at least one active bonus
    for (const [setName, count] of setItemCounts.entries()) {
      const setBonuses = setsData[setName]
      if (setBonuses && setBonuses.some(bonus => count >= bonus.threshold)) {
        activeSets++
      }
    }
  }

  return {
    score,
    propertyValues,
    unusedAugments,
    totalAugments: totalAugmentSlots,
    extraProperties,
    otherEffects,
    activeSets,
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
  const { properties, maxResults = 10, minML = 1, maxML = 34, craftingData, itemFilter, armorType = 'Any', excludeSetAugments = false, mustIncludeArtifact = false, pinnedGear, excludedAugments = [], excludedPacks = [] } = options

  // Filter items by ML range and optional custom filter
  let filteredItems = items.filter(item => item.ml >= minML && item.ml <= maxML)

  // Apply custom filter if provided (e.g., for available items only)
  if (itemFilter) {
    filteredItems = filteredItems.filter(itemFilter)
  }

  // Determine which slots are pinned
  const pinnedSlots = new Set<string>()
  if (pinnedGear) {
    for (const key of Object.keys(pinnedGear) as (keyof GearSetup)[]) {
      if (pinnedGear[key]) {
        pinnedSlots.add(key)
      }
    }
  }

  // For each slot, get top items that provide the selected properties
  const slotItems = new Map<string, Item[]>()

  for (const slot of GEAR_SLOTS) {
    // Skip pinned slots - they won't be optimized
    const slotKey = getSlotKey(slot)
    if (slot === 'Ring') {
      // For rings, check both ring1 and ring2
      if (pinnedSlots.has('ring1') && pinnedSlots.has('ring2')) {
        continue // Both pinned, skip this slot entirely
      }
      // If only one is pinned, we'll handle it below
    } else if (pinnedSlots.has(slotKey)) {
      continue // Skip pinned slots
    }

    let itemsForSlot = getItemsBySlot(filteredItems, slot)

    // Apply armor type filter for Armor slot
    if (slot === 'Armor' && armorType !== 'Any') {
      itemsForSlot = itemsForSlot.filter(item => {
        const itemText = `${item.name} ${item.quests?.join(' ') || ''} ${item.type || ''}`.toLowerCase()
        const armorTypeLower = armorType.toLowerCase()

        if (armorTypeLower === 'cloth') {
          return itemText.includes('cloth') || itemText.includes('outfit') || itemText.includes('robe')
        } else if (armorTypeLower === 'light') {
          return itemText.includes('light') || itemText.includes('leather')
        } else if (armorTypeLower === 'medium') {
          return itemText.includes('medium') || itemText.includes('chainmail') || itemText.includes('scale')
        } else if (armorTypeLower === 'heavy') {
          return itemText.includes('heavy') || itemText.includes('plate') || itemText.includes('fullplate')
        }

        return itemText.includes(armorTypeLower)
      })
    }

    // Score each item based on how much it contributes to selected properties
    // Include crafting contributions in the score
    const scoredItems = itemsForSlot.map(item => {
      const combined = combineAffixes(item.affixes)

      // Also consider crafting options when scoring
      let craftingScore = 0
      if (craftingData && item.crafting) {
        const selections = autoSelectCraftingOptions(item, craftingData, properties, excludeSetAugments, excludedAugments, excludedPacks)
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

      // Add bonus score for items with set memberships
      // This helps ensure set items are considered even if their individual affixes are weak
      let setBonus = 0
      if (item.sets && item.sets.length > 0 && setsData) {
        for (const setName of item.sets) {
          const setBonuses = setsData[setName]
          if (setBonuses) {
            // Look at what the set provides at various thresholds
            for (const bonus of setBonuses) {
              const setBonusAffixes = combineAffixes(bonus.affixes)
              for (const property of properties) {
                const bonusValue = getPropertyTotal(setBonusAffixes, property)
                // Add a fraction of the potential set bonus value to the item's score
                // This incentivizes selecting set items without overvaluing them
                // We divide by threshold to account for how many items needed
                if (bonusValue > 0) {
                  setBonus += (bonusValue / bonus.threshold) * 0.5
                }
              }
            }
          }
        }
      }

      return { item, score: itemScore + craftingScore + setBonus }
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
  let results: OptimizedGearSetup[] = []

  // Generate base setup with top item per slot
  // Start with pinned gear if provided
  const baseSetup: GearSetup = pinnedGear ? { ...pinnedGear } : {}

  for (const slot of GEAR_SLOTS) {
    const items = slotItems.get(slot) || []
    if (items.length > 0) {
      if (slot === 'Ring') {
        // Handle rings - only fill unpinned ring slots
        if (!pinnedSlots.has('ring1')) {
          const validRing1 = items.find(item => !wouldViolateArtifactLimit(baseSetup, item, 'ring1'))
          if (validRing1) {
            baseSetup.ring1 = validRing1
          }
        }
        if (!pinnedSlots.has('ring2')) {
          const validRing2 = items.find(item => item !== baseSetup.ring1 && !wouldViolateArtifactLimit(baseSetup, item, 'ring2'))
          if (validRing2) {
            baseSetup.ring2 = validRing2
          }
        }
      } else {
        const key = getSlotKey(slot)
        // Only fill if not pinned
        if (!pinnedSlots.has(key)) {
          const validItem = items.find(item => !wouldViolateArtifactLimit(baseSetup, item, key))
          if (validItem) {
            baseSetup[key] = validItem
          }
        }
      }
    }
  }

  const baseResult = calculateScore(baseSetup, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks)
  results.push({
    setup: baseSetup,
    score: baseResult.score,
    propertyValues: baseResult.propertyValues,
    unusedAugments: baseResult.unusedAugments,
    totalAugments: baseResult.totalAugments,
    extraProperties: baseResult.extraProperties,
    otherEffects: baseResult.otherEffects,
    activeSets: baseResult.activeSets,
    craftingSelections: baseResult.craftingSelections
  })

  // Generate alternative setups by swapping items
  // Try swapping each slot with its second-best option
  for (const slot of GEAR_SLOTS) {
    const items = slotItems.get(slot) || []
    if (items.length < 2) continue

    // Skip pinned slots
    const key = getSlotKey(slot)
    if (slot === 'Ring') {
      // For rings, only swap unpinned ones
      if (!pinnedSlots.has('ring1')) {
        for (let i = 1; i < Math.min(items.length, 3); i++) {
          const altSetup = { ...baseSetup }
          if (!wouldViolateArtifactLimit(altSetup, items[i], 'ring1')) {
            altSetup.ring1 = items[i]
            const result = calculateScore(altSetup, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks)
            results.push({
              setup: altSetup,
              score: result.score,
              propertyValues: result.propertyValues,
              unusedAugments: result.unusedAugments,
              totalAugments: result.totalAugments,
              extraProperties: result.extraProperties,
              otherEffects: result.otherEffects,
              activeSets: result.activeSets,
              craftingSelections: result.craftingSelections
            })
          }
        }
      }
      if (!pinnedSlots.has('ring2')) {
        for (let i = 1; i < Math.min(items.length, 3); i++) {
          const altSetup = { ...baseSetup }
          if (items[i] !== altSetup.ring1 && !wouldViolateArtifactLimit(altSetup, items[i], 'ring2')) {
            altSetup.ring2 = items[i]
            const result = calculateScore(altSetup, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks)
            results.push({
              setup: altSetup,
              score: result.score,
              propertyValues: result.propertyValues,
              unusedAugments: result.unusedAugments,
              totalAugments: result.totalAugments,
              extraProperties: result.extraProperties,
              otherEffects: result.otherEffects,
              activeSets: result.activeSets,
              craftingSelections: result.craftingSelections
            })
          }
        }
      }
    } else if (!pinnedSlots.has(key)) {
      for (let i = 1; i < Math.min(items.length, 3); i++) {
        const altSetup = { ...baseSetup }
        if (!wouldViolateArtifactLimit(altSetup, items[i], key)) {
          altSetup[key] = items[i]
          const result = calculateScore(altSetup, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks)
          results.push({
            setup: altSetup,
            score: result.score,
            propertyValues: result.propertyValues,
            unusedAugments: result.unusedAugments,
            totalAugments: result.totalAugments,
            extraProperties: result.extraProperties,
            otherEffects: result.otherEffects,
            activeSets: result.activeSets,
            craftingSelections: result.craftingSelections
          })
        }
      }
    }
  }

  // Try set-focused combinations
  // Find sets that provide the selected properties and try to build complete set setups
  if (setsData) {
    const relevantSets = new Set<string>()

    // Find sets that provide our target properties
    for (const [setName, setBonuses] of Object.entries(setsData)) {
      for (const bonus of setBonuses) {
        const setBonusAffixes = combineAffixes(bonus.affixes)
        for (const property of properties) {
          if (getPropertyTotal(setBonusAffixes, property) > 0) {
            relevantSets.add(setName)
            break
          }
        }
      }
    }

    // For each relevant set, try to build a setup using as many items from that set as possible
    for (const setName of relevantSets) {
      const setSetup: GearSetup = { ...baseSetup }
      let foundSetItems = false

      for (const slot of GEAR_SLOTS) {
        const key = getSlotKey(slot)
        // Skip pinned slots
        if (slot === 'Ring') {
          if (!pinnedSlots.has('ring1')) {
            const items = slotItems.get(slot) || []
            const setItem = items.find(item => item.sets?.includes(setName))
            if (setItem && !wouldViolateArtifactLimit(setSetup, setItem, 'ring1')) {
              setSetup.ring1 = setItem
              foundSetItems = true
            }
          }
          if (!pinnedSlots.has('ring2')) {
            const items = slotItems.get(slot) || []
            const setItem = items.find(item => item.sets?.includes(setName) && item !== setSetup.ring1)
            if (setItem && !wouldViolateArtifactLimit(setSetup, setItem, 'ring2')) {
              setSetup.ring2 = setItem
              foundSetItems = true
            }
          }
        } else if (!pinnedSlots.has(key)) {
          const items = slotItems.get(slot) || []
          const setItem = items.find(item => item.sets?.includes(setName))
          if (setItem && !wouldViolateArtifactLimit(setSetup, setItem, key)) {
            setSetup[key] = setItem
            foundSetItems = true
          }
        }
      }

      if (foundSetItems) {
        const result = calculateScore(setSetup, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks)
        results.push({
          setup: setSetup,
          score: result.score,
          propertyValues: result.propertyValues,
          unusedAugments: result.unusedAugments,
          totalAugments: result.totalAugments,
          extraProperties: result.extraProperties,
          otherEffects: result.otherEffects,
          activeSets: result.activeSets,
          craftingSelections: result.craftingSelections
        })
      }
    }
  }

  // Filter by mustIncludeArtifact if required
  if (mustIncludeArtifact) {
    results = results.filter(result => {
      const setup = result.setup
      const slots: (keyof GearSetup)[] = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']
      return slots.some(slot => setup[slot]?.artifact === true)
    })
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

  // Import isComplexProperty to filter out complex properties
  const { isComplexProperty } = require('./affixStacking')

  // Filter out complex properties from the available list
  return Array.from(propertySet)
    .filter(prop => !isComplexProperty(prop))
    .sort()
}
