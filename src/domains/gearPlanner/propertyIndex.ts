import { CraftingData, Item, ItemAffix, SetsData } from '@/api/ddoGearPlanner'

import { COMPLEX_PROPERTIES } from './affixStacking'

// --- Types ---

export interface ItemSource {
  itemName: string
  slot: string
  value: number
  sets?: string[]
}

export interface SetBonusSource {
  setName: string
  threshold: number
  value: number
}

export interface CraftingSource {
  craftingSlotType: string
  optionName: string
  value: number
  setMembership: string | null
}

export interface BonusTypeEntry {
  maxValue: number
  fromItems: ItemSource[]
  fromSets: SetBonusSource[]
  fromCrafting: CraftingSource[]
}

/**
 * Inverted index: property → bonus type → sources.
 * Enables O(1) lookup of all sources for any (property, bonusType) pair.
 */
export type PropertyBonusIndex = Map<string, Map<string, BonusTypeEntry>>

export interface SetSummary {
  setName: string
  minThreshold: number
  /** Properties provided at each threshold */
  thresholds: Array<{
    threshold: number
    affixes: Array<{ property: string; bonusType: string; value: number }>
  }>
  /** Whether a set augment exists for this set */
  hasSetAugment: boolean
}

export interface GapAnalysisResult {
  property: string
  bonusType: string
  currentValue: number
  bestAvailable: number
  /** Improvement if best source is used */
  potentialGain: number
  sources: {
    items: ItemSource[]
    sets: SetBonusSource[]
    crafting: CraftingSource[]
  }
}

// --- Index Builder ---

function normalizeAffixName(name: string): string {
  if (name === 'Spell Focus') return 'Spell Focus Mastery'
  return name
}

function expandAffix(affix: ItemAffix): Array<{ name: string; type: string; value: number }> {
  const name = normalizeAffixName(affix.name)
  const type = affix.type
  if (!type || type === 'bool') return []

  const numValue = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
  if (isNaN(numValue) || numValue === 0) return []

  const components = COMPLEX_PROPERTIES[name]
  if (components) {
    return components.map(comp => ({ name: comp, type, value: numValue }))
  }
  return [{ name, type, value: numValue }]
}

function getOrCreateBonusEntry(
  index: PropertyBonusIndex,
  property: string,
  bonusType: string,
): BonusTypeEntry {
  let propMap = index.get(property)
  if (!propMap) {
    propMap = new Map()
    index.set(property, propMap)
  }
  let entry = propMap.get(bonusType)
  if (!entry) {
    entry = { maxValue: -Infinity, fromItems: [], fromSets: [], fromCrafting: [] }
    propMap.set(bonusType, entry)
  }
  return entry
}

/**
 * Build the property-bonus index from all data sources.
 * One-time O(items*affixes + sets*thresholds*affixes + crafting) scan.
 */
export function buildPropertyBonusIndex(
  items: Item[],
  setsData: SetsData | null,
  craftingData: CraftingData | null,
): PropertyBonusIndex {
  const index: PropertyBonusIndex = new Map()

  // 1. Index items
  for (const item of items) {
    for (const affix of item.affixes) {
      for (const expanded of expandAffix(affix)) {
        const entry = getOrCreateBonusEntry(index, expanded.name, expanded.type)
        entry.fromItems.push({
          itemName: item.name,
          slot: item.slot,
          value: expanded.value,
          sets: item.sets,
        })
        if (expanded.value > entry.maxValue) entry.maxValue = expanded.value
      }
    }
  }

  // 2. Index set bonuses
  if (setsData) {
    for (const [setName, bonuses] of Object.entries(setsData)) {
      for (const bonus of bonuses) {
        for (const affix of bonus.affixes) {
          for (const expanded of expandAffix(affix)) {
            const entry = getOrCreateBonusEntry(index, expanded.name, expanded.type)
            entry.fromSets.push({
              setName,
              threshold: bonus.threshold,
              value: expanded.value,
            })
            if (expanded.value > entry.maxValue) entry.maxValue = expanded.value
          }
        }
      }
    }
  }

  // 3. Index crafting options
  if (craftingData) {
    for (const [slotType, groups] of Object.entries(craftingData)) {
      for (const [, optionList] of Object.entries(groups)) {
        if (!Array.isArray(optionList)) continue
        for (const option of optionList) {
          if (!option.affixes) continue
          for (const affix of option.affixes) {
            for (const expanded of expandAffix(affix)) {
              const entry = getOrCreateBonusEntry(index, expanded.name, expanded.type)
              entry.fromCrafting.push({
                craftingSlotType: slotType,
                optionName: option.name ?? '',
                value: expanded.value,
                setMembership: option.set ?? null,
              })
              if (expanded.value > entry.maxValue) entry.maxValue = expanded.value
            }
          }
        }
      }
    }
  }

  return index
}

// --- Query Functions ---

/**
 * Theoretical maximum for a property (sum of best value per bonus type).
 * Ignores slot conflicts — represents the ceiling.
 */
export function getTheoreticalMax(index: PropertyBonusIndex, property: string): number {
  const propMap = index.get(property)
  if (!propMap) return 0

  let total = 0
  for (const entry of propMap.values()) {
    if (entry.maxValue > 0) total += entry.maxValue
  }
  return total
}

/**
 * Get all bonus types available for a property with their max values.
 */
export function getBonusTypeSummary(
  index: PropertyBonusIndex,
  property: string,
): Map<string, number> {
  const result = new Map<string, number>()
  const propMap = index.get(property)
  if (!propMap) return result

  for (const [bonusType, entry] of propMap) {
    if (entry.maxValue > 0) result.set(bonusType, entry.maxValue)
  }
  return result
}

/**
 * Gap analysis: find bonus types where the current setup has room for improvement.
 * Returns uncovered or under-utilized bonus types with improvement sources.
 */
export function getGapAnalysis(
  index: PropertyBonusIndex,
  property: string,
  currentBonuses: Map<string, number>,
): GapAnalysisResult[] {
  const propMap = index.get(property)
  if (!propMap) return []

  const results: GapAnalysisResult[] = []

  for (const [bonusType, entry] of propMap) {
    if (entry.maxValue <= 0) continue

    const currentValue = currentBonuses.get(bonusType) ?? 0
    const gain = entry.maxValue - currentValue

    if (gain > 0) {
      results.push({
        property,
        bonusType,
        currentValue,
        bestAvailable: entry.maxValue,
        potentialGain: gain,
        sources: {
          items: entry.fromItems.filter(s => s.value > currentValue),
          sets: entry.fromSets.filter(s => s.value > currentValue),
          crafting: entry.fromCrafting.filter(s => s.value > currentValue),
        },
      })
    }
  }

  // Sort by potential gain descending
  results.sort((a, b) => b.potentialGain - a.potentialGain)
  return results
}

/**
 * Build a summary of each set: what properties it provides, at what thresholds.
 */
export function buildSetSummaries(
  setsData: SetsData | null,
  craftingData: CraftingData | null,
): Map<string, SetSummary> {
  const result = new Map<string, SetSummary>()
  if (!setsData) return result

  // Collect set augment availability
  const setsWithAugments = new Set<string>()
  if (craftingData) {
    for (const groups of Object.values(craftingData)) {
      for (const optionList of Object.values(groups)) {
        if (!Array.isArray(optionList)) continue
        for (const option of optionList) {
          if (option.set) setsWithAugments.add(option.set)
        }
      }
    }
  }

  for (const [setName, bonuses] of Object.entries(setsData)) {
    if (bonuses.length === 0) continue

    const thresholds = bonuses.map(bonus => ({
      threshold: bonus.threshold,
      affixes: bonus.affixes.flatMap(affix => {
        return expandAffix(affix).map(e => ({
          property: e.name,
          bonusType: e.type,
          value: e.value,
        }))
      }),
    }))

    result.set(setName, {
      setName,
      minThreshold: Math.min(...bonuses.map(b => b.threshold)),
      thresholds,
      hasSetAugment: setsWithAugments.has(setName),
    })
  }

  return result
}

/**
 * For a set of tracked properties, find which sets provide the most value.
 * Returns sets ranked by how many tracked properties they contribute to.
 */
export function rankSetsForProperties(
  setSummaries: Map<string, SetSummary>,
  trackedProperties: string[],
  currentBonuses: Map<string, Map<string, number>>,
): Array<{
  setName: string
  minThreshold: number
  hasSetAugment: boolean
  contributions: Array<{
    property: string
    bonusType: string
    value: number
    marginalGain: number
  }>
  totalMarginalGain: number
}> {
  const results: Array<{
    setName: string
    minThreshold: number
    hasSetAugment: boolean
    contributions: Array<{
      property: string
      bonusType: string
      value: number
      marginalGain: number
    }>
    totalMarginalGain: number
  }> = []

  for (const [setName, summary] of setSummaries) {
    const contributions: Array<{
      property: string
      bonusType: string
      value: number
      marginalGain: number
    }> = []

    for (const threshold of summary.thresholds) {
      for (const affix of threshold.affixes) {
        if (!trackedProperties.includes(affix.property)) continue

        const propBonuses = currentBonuses.get(affix.property)
        const currentValue = propBonuses?.get(affix.bonusType) ?? 0
        const gain = Math.max(0, affix.value - currentValue)

        if (gain > 0) {
          contributions.push({
            property: affix.property,
            bonusType: affix.bonusType,
            value: affix.value,
            marginalGain: gain,
          })
        }
      }
    }

    if (contributions.length > 0) {
      results.push({
        setName,
        minThreshold: summary.minThreshold,
        hasSetAugment: summary.hasSetAugment,
        contributions,
        totalMarginalGain: contributions.reduce((sum, c) => sum + c.marginalGain, 0),
      })
    }
  }

  results.sort((a, b) => b.totalMarginalGain - a.totalMarginalGain)
  return results
}

/**
 * All property names in the index (excludes complex properties, sorted).
 */
export function getIndexedProperties(index: PropertyBonusIndex): string[] {
  return [...index.keys()].sort()
}
