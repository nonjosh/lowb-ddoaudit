import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'

import { combineAffixes, COMPLEX_PROPERTIES, getPropertyTotal } from './affixStacking'
import { autoSelectCraftingOptions, getCraftingAffixes } from './craftingHelpers'
import { GEAR_SLOTS, GearSetup, GearSlot, getItemsBySlot, getSlotKey } from './gearSetup'
import { evaluateGearSetup } from './optimization'
import { PropertyBonusIndex, getTheoreticalMax } from './propertyIndex'
import {
  GearConstraint,
  ScoreBreakdown,
  computePropertyWeights,
  computeScore,
  computeScoreDelta,
  precomputePropertyMaxValues,
} from './scoring'

// --- Types ---

export interface SlotSuggestion {
  item: Item
  slot: GearSlot
  slotKey: keyof GearSetup
  score: ScoreBreakdown
  /** Score improvement vs. current item (positive = better) */
  totalDelta: number
  /** Per-property value deltas (positive = improvement) */
  propertyDeltas: Map<string, number>
}

export interface SuggestionsResult {
  /** Top suggestions per slot, keyed by GearSlot */
  bySlot: Map<string, SlotSuggestion[]>
  /** Current setup score */
  currentScore: ScoreBreakdown
}

export interface SuggestionsOptions {
  /** Maximum level of items to consider */
  maxLevel?: number
  /** Maximum suggestions per slot */
  topN?: number
  /** Slots to skip (pinned by user) */
  pinnedSlots?: Set<string>
  /** Properties to exclude from Set Augment auto-selection */
  excludeSetAugments?: boolean
  excludedAugments?: string[]
  excludedPacks?: string[]
}

// --- Suggestion Engine ---

/**
 * For each gear slot, find the top N items that would improve the current setup.
 * Uses evaluateGearSetup for accurate stacking + set bonus calculation.
 */
export function getSlotSuggestions(
  currentSetup: GearSetup,
  items: Item[],
  properties: string[],
  setsData: SetsData | null,
  craftingData: CraftingData | null,
  index: PropertyBonusIndex,
  constraints: GearConstraint[] = [],
  options: SuggestionsOptions = {},
): SuggestionsResult {
  const {
    maxLevel,
    topN = 5,
    pinnedSlots = new Set(),
    excludeSetAugments = false,
    excludedAugments = [],
    excludedPacks = [],
  } = options

  const weights = computePropertyWeights(properties)
  const maxValues = precomputePropertyMaxValues(index, properties)

  // Score current setup
  const currentEval = evaluateGearSetup(
    currentSetup, properties, setsData, craftingData,
    excludeSetAugments, excludedAugments, excludedPacks,
  )
  const currentScore = computeScore(currentEval.propertyValues, weights, maxValues, constraints)

  const bySlot = new Map<string, SlotSuggestion[]>()

  for (const slot of GEAR_SLOTS) {
    // Handle Ring slot (ring1, ring2)
    const slotVariants: Array<{ slotKey: keyof GearSetup; ringIndex?: number }> =
      slot === 'Ring'
        ? [{ slotKey: 'ring1', ringIndex: 0 }, { slotKey: 'ring2', ringIndex: 1 }]
        : [{ slotKey: getSlotKey(slot) }]

    for (const { slotKey, ringIndex } of slotVariants) {
      const displaySlot = ringIndex !== undefined ? `Ring ${ringIndex + 1}` : slot

      if (pinnedSlots.has(slotKey) || pinnedSlots.has(displaySlot)) continue

      const candidates = getItemsBySlot(items, slot)
      const currentItem = currentSetup[slotKey]

      const suggestions: SlotSuggestion[] = []

      for (const candidate of candidates) {
        // Skip current item
        if (currentItem && candidate.name === currentItem.name) continue

        // Level filter
        if (maxLevel !== undefined && candidate.ml > maxLevel) continue

        // Build trial setup
        const trialSetup = { ...currentSetup, [slotKey]: candidate }

        const trialEval = evaluateGearSetup(
          trialSetup, properties, setsData, craftingData,
          excludeSetAugments, excludedAugments, excludedPacks,
        )
        const trialScore = computeScore(trialEval.propertyValues, weights, maxValues, constraints)

        const delta = computeScoreDelta(currentScore, trialScore)

        // Only include items that improve the score
        if (delta.totalDelta > 0) {
          suggestions.push({
            item: candidate,
            slot,
            slotKey,
            score: trialScore,
            totalDelta: delta.totalDelta,
            propertyDeltas: delta.propertyDeltas,
          })
        }
      }

      // Sort by score delta descending, take top N
      suggestions.sort((a, b) => b.totalDelta - a.totalDelta)
      const topSuggestions = suggestions.slice(0, topN)

      if (topSuggestions.length > 0) {
        bySlot.set(displaySlot, topSuggestions)
      }
    }
  }

  return { bySlot, currentScore }
}

// --- Single-Slot Improvement Scores ---

/**
 * Compute improvement scores for candidate items in a specific slot.
 * Returns a Map from item name to score delta (positive = better than current).
 * Used by the item selection dialog to show which items improve the setup.
 */
export function computeItemImprovements(
  currentSetup: GearSetup,
  slotKey: keyof GearSetup,
  candidates: Item[],
  properties: string[],
  setsData: SetsData | null,
  craftingData: CraftingData | null,
  index: PropertyBonusIndex,
  options: Pick<SuggestionsOptions, 'excludeSetAugments' | 'excludedAugments' | 'excludedPacks'> = {},
): Map<string, number> {
  const {
    excludeSetAugments = false,
    excludedAugments = [],
    excludedPacks = [],
  } = options

  const weights = computePropertyWeights(properties)
  const maxValues = precomputePropertyMaxValues(index, properties)

  const currentEval = evaluateGearSetup(
    currentSetup, properties, setsData, craftingData,
    excludeSetAugments, excludedAugments, excludedPacks,
  )
  const currentScore = computeScore(currentEval.propertyValues, weights, maxValues)

  const improvements = new Map<string, number>()
  const currentItem = currentSetup[slotKey]

  for (const candidate of candidates) {
    if (currentItem && candidate.name === currentItem.name) continue

    const trialSetup = { ...currentSetup, [slotKey]: candidate }
    const trialEval = evaluateGearSetup(
      trialSetup, properties, setsData, craftingData,
      excludeSetAugments, excludedAugments, excludedPacks,
    )
    const trialScore = computeScore(trialEval.propertyValues, weights, maxValues)
    improvements.set(candidate.name, trialScore.total - currentScore.total)
  }

  return improvements
}

// --- Greedy Optimizer ---

export interface OptimizeResult {
  setup: GearSetup
}

/**
 * Normalize an affix name the same way the property index does.
 */
function normalizeAffixName(name: string): string {
  if (name === 'Spell Focus') return 'Spell Focus Mastery'
  return name
}

/**
 * Expand an affix into its underlying property contributions.
 * Mirrors the logic in propertyIndex.ts expandAffix but returns
 * {property, bonusType, value} tuples.
 */
function expandItemAffix(affix: { name: string; type: string; value: string | number }): Array<{ property: string; bonusType: string; value: number }> {
  const name = normalizeAffixName(affix.name)
  const bonusType = affix.type
  if (!bonusType || bonusType === 'bool') return []

  const numValue = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
  if (isNaN(numValue) || numValue <= 0) return []

  const components = COMPLEX_PROPERTIES[name]
  if (components) {
    return components.map(comp => ({ property: comp, bonusType, value: numValue }))
  }
  return [{ property: name, bonusType, value: numValue }]
}

/**
 * Greedy optimizer: for each slot, pick the item that provides the most
 * incremental value for tracked properties (new or higher bonus types).
 *
 * Much faster than coordinate descent because it never calls evaluateGearSetup
 * during the search — it only scans item affixes directly.
 */
export function optimizeSetup(
  initialSetup: GearSetup,
  items: Item[],
  properties: string[],
  _setsData: SetsData | null,
  _craftingData: CraftingData | null,
  index: PropertyBonusIndex,
  _constraints: GearConstraint[],
  options: SuggestionsOptions = {},
): OptimizeResult {
  const {
    maxLevel,
    pinnedSlots = new Set(),
  } = options

  const trackedSet = new Set(properties)

  // Compute theoretical max for normalization so different-scale properties
  // contribute proportionally (e.g., Constitution ~37 vs Spell DC ~10)
  const theoreticalMax = new Map<string, number>()
  for (const prop of properties) {
    const max = getTheoreticalMax(index, prop)
    theoreticalMax.set(prop, max > 0 ? max : 1)
  }

  // Track best covered bonus values per (property, bonusType)
  const covered = new Map<string, Map<string, number>>()
  const getCovered = (prop: string, bt: string) => covered.get(prop)?.get(bt) ?? 0
  const setCovered = (prop: string, bt: string, val: number) => {
    if (!covered.has(prop)) covered.set(prop, new Map())
    covered.get(prop)!.set(bt, val)
  }

  const setup: GearSetup = {}
  const usedSlots = new Set<keyof GearSetup>()
  let hasArtifact = false

  // 1. Initialize pinned slots and their coverage
  for (const slot of GEAR_SLOTS) {
    const slotKeys: (keyof GearSetup)[] = slot === 'Ring'
      ? ['ring1', 'ring2']
      : [getSlotKey(slot)]

    for (const sk of slotKeys) {
      if (pinnedSlots.has(sk) && initialSetup[sk]) {
        setup[sk] = initialSetup[sk]
        usedSlots.add(sk)
        if (initialSetup[sk]!.artifact) hasArtifact = true

        for (const affix of initialSetup[sk]!.affixes) {
          for (const { property, bonusType, value } of expandItemAffix(affix)) {
            if (!trackedSet.has(property)) continue
            if (value > getCovered(property, bonusType)) {
              setCovered(property, bonusType, value)
            }
          }
        }
      }
    }
  }

  // 2. Pre-group items by slot and filter
  const candidatesBySlot = new Map<GearSlot, Item[]>()
  for (const slot of GEAR_SLOTS) {
    candidatesBySlot.set(
      slot,
      getItemsBySlot(items, slot).filter(item =>
        maxLevel === undefined || item.ml <= maxLevel
      ),
    )
  }

  // 3. Greedy: repeatedly pick the (slot, item) combo with highest marginal value
  //    until no improvement is possible
  for (; ;) {
    let bestItem: Item | null = null
    let bestSlotKey: keyof GearSetup | null = null
    let bestMarginal = 0

    for (const slot of GEAR_SLOTS) {
      const slotKeys: (keyof GearSetup)[] = slot === 'Ring'
        ? ['ring1', 'ring2']
        : [getSlotKey(slot)]

      for (const sk of slotKeys) {
        if (usedSlots.has(sk)) continue

        for (const item of candidatesBySlot.get(slot) ?? []) {
          // Only one minor artifact allowed
          if (item.artifact && hasArtifact) continue

          let marginal = 0
          for (const affix of item.affixes) {
            for (const { property, bonusType, value } of expandItemAffix(affix)) {
              if (!trackedSet.has(property)) continue
              const cur = getCovered(property, bonusType)
              if (value > cur) {
                // Normalize increment by theoretical max
                const maxVal = theoreticalMax.get(property) ?? 1
                marginal += (value - cur) / maxVal
              }
            }
          }

          if (marginal > bestMarginal) {
            bestMarginal = marginal
            bestItem = item
            bestSlotKey = sk
          }
        }
      }
    }

    if (!bestItem || !bestSlotKey || bestMarginal <= 0) break

    setup[bestSlotKey] = bestItem
    usedSlots.add(bestSlotKey)
    if (bestItem.artifact) hasArtifact = true

    // Update coverage
    for (const affix of bestItem.affixes) {
      for (const { property, bonusType, value } of expandItemAffix(affix)) {
        if (!trackedSet.has(property)) continue
        if (value > getCovered(property, bonusType)) {
          setCovered(property, bonusType, value)
        }
      }
    }
  }

  return { setup }
}

// --- Slot-Swap Variant Generator ---

/**
 * Score an item by how much it individually contributes to tracked properties.
 * Includes crafting affix contributions and a fractional set bonus incentive.
 */
function scoreItem(
  item: Item,
  properties: string[],
  setsData: SetsData | null,
  craftingData: CraftingData | null,
  excludeSetAugments: boolean,
  excludedAugments: string[],
  excludedPacks: string[],
): number {
  const combined = combineAffixes(item.affixes)

  let score = 0
  for (const property of properties) {
    score += getPropertyTotal(combined, property)
  }

  // Include crafting augment contributions
  if (craftingData && item.crafting) {
    const selections = autoSelectCraftingOptions(
      item, craftingData, properties, excludeSetAugments, excludedAugments, excludedPacks,
    )
    const craftingAffixes = getCraftingAffixes(selections)
    const craftingCombined = combineAffixes(craftingAffixes)
    for (const property of properties) {
      score += getPropertyTotal(craftingCombined, property)
    }
  }

  // Fractional set bonus incentive
  if (item.sets && item.sets.length > 0 && setsData) {
    for (const setName of item.sets) {
      const setBonuses = setsData[setName]
      if (!setBonuses) continue
      for (const bonus of setBonuses) {
        const setBonusAffixes = combineAffixes(bonus.affixes)
        for (const property of properties) {
          const bonusValue = getPropertyTotal(setBonusAffixes, property)
          if (bonusValue > 0) {
            score += (bonusValue / bonus.threshold) * 0.5
          }
        }
      }
    }
  }

  return score
}

/**
 * Generate variant setups by swapping individual slots in the base setup
 * with alternative high-scoring items. Each variant differs from the base
 * by exactly one slot, producing many meaningfully different plans.
 */
export function generateSlotSwapVariants(
  baseSetup: GearSetup,
  items: Item[],
  properties: string[],
  setsData: SetsData | null,
  craftingData: CraftingData | null,
  options: SuggestionsOptions = {},
  alternativesPerSlot = 2,
): GearSetup[] {
  const {
    maxLevel,
    pinnedSlots = new Set(),
    excludeSetAugments = false,
    excludedAugments = [],
    excludedPacks = [],
  } = options

  const variants: GearSetup[] = []

  // Count minor artifacts in the base setup (excluding the slot being swapped)
  const countArtifacts = (setup: GearSetup, excludeSlot?: keyof GearSetup): number => {
    let count = 0
    for (const key of Object.keys(setup) as (keyof GearSetup)[]) {
      if (key === excludeSlot) continue
      if (setup[key]?.artifact) count++
    }
    return count
  }

  for (const slot of GEAR_SLOTS) {
    // Skip weapon slots (as old code did)
    if (slot === 'Weapon' || slot === 'Offhand') continue

    const slotKeys: (keyof GearSetup)[] = slot === 'Ring'
      ? ['ring1', 'ring2']
      : [getSlotKey(slot)]

    for (const sk of slotKeys) {
      if (pinnedSlots.has(sk)) continue

      let candidates = getItemsBySlot(items, slot)
      if (maxLevel !== undefined) {
        candidates = candidates.filter(item => item.ml <= maxLevel)
      }

      const currentItem = baseSetup[sk]
      const currentItemName = currentItem?.name

      // Score and rank candidates
      const scored = candidates
        .filter(item => item.name !== currentItemName)
        .map(item => ({
          item,
          score: scoreItem(item, properties, setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks),
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, alternativesPerSlot + 5) // take extra to account for artifact filtering

      const artifactsExcluding = countArtifacts(baseSetup, sk)
      let added = 0

      for (const { item } of scored) {
        if (added >= alternativesPerSlot) break
        // Minor artifact limit
        if (item.artifact && artifactsExcluding >= 1) continue
        // For ring2, don't duplicate ring1
        if (sk === 'ring2' && baseSetup.ring1 && item.name === baseSetup.ring1.name) continue

        const variant = { ...baseSetup, [sk]: item }
        variants.push(variant)
        added++
      }
    }
  }

  return variants
}

// --- Set-Focused Variant Generator ---

/**
 * Generate variant setups that try to maximize specific gear sets that
 * provide tracked properties. For each relevant set, swap in set items
 * where possible.
 */
export function generateSetFocusedVariants(
  baseSetup: GearSetup,
  items: Item[],
  properties: string[],
  setsData: SetsData | null,
  options: SuggestionsOptions = {},
): GearSetup[] {
  if (!setsData) return []

  const {
    maxLevel,
    pinnedSlots = new Set(),
  } = options

  const variants: GearSetup[] = []

  // Find sets that provide at least one tracked property
  const relevantSets = new Set<string>()
  for (const [setName, setBonuses] of Object.entries(setsData)) {
    for (const bonus of setBonuses) {
      const setBonusAffixes = combineAffixes(bonus.affixes)
      for (const property of properties) {
        if (getPropertyTotal(setBonusAffixes, property) > 0) {
          relevantSets.add(setName)
          break
        }
      }
      if (relevantSets.has(setName)) break
    }
  }

  // Pre-group items by slot with level filtering
  const itemsBySlot = new Map<GearSlot, Item[]>()
  for (const slot of GEAR_SLOTS) {
    if (slot === 'Weapon' || slot === 'Offhand') continue
    let slotItems = getItemsBySlot(items, slot)
    if (maxLevel !== undefined) {
      slotItems = slotItems.filter(item => item.ml <= maxLevel)
    }
    itemsBySlot.set(slot, slotItems)
  }

  for (const setName of relevantSets) {
    const setSetup: GearSetup = { ...baseSetup }
    let foundSetItems = false

    const countArtifacts = (): number => {
      let count = 0
      for (const key of Object.keys(setSetup) as (keyof GearSetup)[]) {
        if (setSetup[key]?.artifact) count++
      }
      return count
    }

    for (const slot of GEAR_SLOTS) {
      if (slot === 'Weapon' || slot === 'Offhand') continue

      const slotKeys: (keyof GearSetup)[] = slot === 'Ring'
        ? ['ring1', 'ring2']
        : [getSlotKey(slot)]

      for (const sk of slotKeys) {
        if (pinnedSlots.has(sk)) continue

        const slotItems = itemsBySlot.get(slot) ?? []
        const setItem = slotItems.find(item => {
          if (!item.sets?.includes(setName)) return false
          if (item.artifact && countArtifacts() >= 1 && !setSetup[sk]?.artifact) return false
          if (sk === 'ring2' && setSetup.ring1 && item.name === setSetup.ring1.name) return false
          return true
        })

        if (setItem) {
          setSetup[sk] = setItem
          foundSetItems = true
        }
      }
    }

    if (foundSetItems) {
      variants.push(setSetup)
    }
  }

  return variants
}
