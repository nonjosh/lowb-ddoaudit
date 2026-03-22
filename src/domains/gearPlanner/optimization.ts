import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import { combineAffixes, getPropertyBreakdown, getPropertyTotal, isComplexProperty } from './affixStacking'
import {
  autoSelectCraftingOptionsForGearSetup,
  countAugmentSlots,
  getCraftingAffixes,
  getCraftingSetMemberships,
  GearCraftingSelections
} from './craftingHelpers'
import { isValidWeaponCombination } from './fightingStyles'
import { getGearAffixes, GearSetup } from './gearSetup'

/**
 * Evaluated gear setup with property values and breakdowns for display
 */
export interface EvaluatedGearSetup {
  setup: GearSetup
  propertyValues: Map<string, number>
  /** Breakdown of bonuses by type for each property (for tooltips) */
  propertyBreakdowns?: Map<string, Map<string, number>>
  unusedAugments?: number
  totalAugments?: number
  extraProperties?: number
  otherEffects?: string[]
  /** Number of sets with active bonuses */
  activeSets?: number
  /** Crafting selections for each slot */
  craftingSelections?: GearCraftingSelections
}

/** @deprecated Use EvaluatedGearSetup instead */
export type OptimizedGearSetup = EvaluatedGearSetup

/**
 * Evaluates a gear setup: calculates property values, breakdowns, unused augment slots,
 * active sets, and other effects. Used for display purposes.
 */
export function evaluateGearSetup(
  setup: GearSetup,
  properties: string[],
  setsData: SetsData | null,
  craftingData?: CraftingData | null,
  excludeSetAugments = false,
  excludedAugments: string[] = [],
  excludedPacks: string[] = [],
  existingCraftingSelections?: GearCraftingSelections
): {
  propertyValues: Map<string, number>
  propertyBreakdowns: Map<string, Map<string, number>>
  unusedAugments: number
  totalAugments: number
  extraProperties: number
  otherEffects: string[]
  activeSets: number
  craftingSelections: GearCraftingSelections
} {
  const slotKeys: (keyof GearSetup)[] = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket', 'mainHand', 'offHand']

  // Create effective setup: ignore off-hand if main hand blocks it
  let effectiveSetup = setup
  if (setup.mainHand && setup.offHand) {
    if (!isValidWeaponCombination(setup.mainHand, setup.offHand)) {
      effectiveSetup = { ...setup, offHand: undefined }
    }
  }

  // Get base affixes from gear first (without crafting) to know what's already covered
  const baseAffixes = getGearAffixes(effectiveSetup, setsData, [])

  // Auto-select crafting options for entire gear setup, respecting stacking rules
  const gearSetupRecord: Record<string, Item | undefined> = {}
  for (const slotKey of slotKeys) {
    gearSetupRecord[slotKey] = effectiveSetup[slotKey]
  }

  const craftingSelections = existingCraftingSelections ?? autoSelectCraftingOptionsForGearSetup(
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
  const baseAffixesWithSets = getGearAffixes(effectiveSetup, setsData, additionalSetMemberships)

  // Collect crafting affixes
  const allCraftingAffixes = Object.values(craftingSelections).flatMap(selections =>
    getCraftingAffixes(selections)
  )

  // Combine all affixes
  const allAffixes = [...baseAffixesWithSets, ...allCraftingAffixes]
  const combined = combineAffixes(allAffixes)

  const propertyValues = new Map<string, number>()
  const propertyBreakdowns = new Map<string, Map<string, number>>()

  // Calculate property values for display
  for (const property of properties) {
    // Store display value (minimum for complex properties)
    const displayValue = getPropertyTotal(combined, property, true)
    propertyValues.set(property, displayValue)
    // Store breakdown for tooltips
    const breakdown = getPropertyBreakdown(combined, property)
    propertyBreakdowns.set(property, breakdown)
  }

  // Count augment slots
  let totalAugmentSlots = 0
  let usedAugmentSlots = 0

  for (const slotKey of slotKeys) {
    const item = effectiveSetup[slotKey]
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
      const item = effectiveSetup[slotKey]
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
    propertyValues,
    propertyBreakdowns,
    unusedAugments,
    totalAugments: totalAugmentSlots,
    extraProperties,
    otherEffects,
    activeSets,
    craftingSelections
  }
}

/** @deprecated Use evaluateGearSetup instead */
export const calculateScore = evaluateGearSetup

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

  // Filter out complex properties from the available list
  return Array.from(propertySet)
    .filter(prop => !isComplexProperty(prop))
    .sort()
}
