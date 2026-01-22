import { CraftingData, CraftingOption } from '@/api/ddoGearPlanner/crafting'
import { Item, ItemAffix } from '@/api/ddoGearPlanner/items'

/**
 * Crafting slot categories based on their function
 */
export enum CraftingSlotCategory {
  /** Traditional gem slots (Blue, Red, Yellow, etc.) */
  AugmentSlot = 'augment',
  /** Slots that allow selecting which set bonus to activate */
  SetBonusSlot = 'setBonus',
  /** Slots that allow choosing one affix from available options */
  AffixSelectionSlot = 'affixSelection',
  /** Items with random properties at drop - skip for optimization */
  RandomSlot = 'random'
}

// Augment slot types (9 total)
const AUGMENT_SLOT_PATTERNS = [
  'Blue Augment Slot',
  'Colorless Augment Slot',
  'Green Augment Slot',
  'Moon Augment Slot',
  'Orange Augment Slot',
  'Purple Augment Slot',
  'Red Augment Slot',
  'Sun Augment Slot',
  'Yellow Augment Slot'
]

// Set bonus slot types (12 total) - allow selecting which set to activate
const SET_BONUS_SLOT_PATTERNS = [
  'Lost Purpose',
  'Legendary Lost Purpose',
  "Slaver's Set Bonus",
  "Legendary Slaver's Set Bonus",
  'Isle of Dread: Set Bonus Slot',
  'Random set 1',
  'Random set 2'
]

// Random/choice slots (7 total) - items have random properties at drop
const RANDOM_SLOT_PATTERNS = [
  'One of the following',
  'Random effect',
  'Random set'
]

/**
 * Determine the category of a crafting slot type
 */
export function getCraftingSlotCategory(slotType: string): CraftingSlotCategory {
  // Check for augment slots
  if (AUGMENT_SLOT_PATTERNS.includes(slotType)) {
    return CraftingSlotCategory.AugmentSlot
  }

  // Check for random/choice slots first (before set bonus since some overlap)
  if (RANDOM_SLOT_PATTERNS.some(pattern => slotType.startsWith(pattern))) {
    return CraftingSlotCategory.RandomSlot
  }

  // Check for set bonus slots
  if (SET_BONUS_SLOT_PATTERNS.some(pattern => slotType.includes(pattern))) {
    return CraftingSlotCategory.SetBonusSlot
  }

  // Everything else is an affix selection slot
  return CraftingSlotCategory.AffixSelectionSlot
}

/**
 * Check if a crafting slot is an augment slot
 */
export function isAugmentSlot(slotType: string): boolean {
  return getCraftingSlotCategory(slotType) === CraftingSlotCategory.AugmentSlot
}

/**
 * Check if a crafting slot is a set bonus slot
 */
export function isSetBonusSlot(slotType: string): boolean {
  return getCraftingSlotCategory(slotType) === CraftingSlotCategory.SetBonusSlot
}

/**
 * Check if a crafting slot should be skipped during optimization (random/choice slots)
 */
export function isRandomSlot(slotType: string): boolean {
  return getCraftingSlotCategory(slotType) === CraftingSlotCategory.RandomSlot
}

/**
 * Get the augment color from a slot type name (returns undefined for non-augment slots)
 */
export function getAugmentSlotColor(slotType: string): string | undefined {
  const lower = slotType.toLowerCase()
  if (lower.includes('blue augment')) return 'blue'
  if (lower.includes('red augment')) return 'red'
  if (lower.includes('yellow augment')) return 'yellow'
  if (lower.includes('green augment')) return 'green'
  if (lower.includes('purple augment')) return 'purple'
  if (lower.includes('orange augment')) return 'orange'
  if (lower.includes('colorless augment')) return 'colorless'
  if (lower.includes('moon augment')) return 'moon'
  if (lower.includes('sun augment')) return 'sun'
  return undefined
}

/**
 * Augment slot compatibility rules:
 * - Colorless: can slot in blue/yellow/red/green/purple/orange
 * - Red: can slot in red/purple/orange
 * - Blue: can slot in blue/green/purple
 * - Yellow: can slot in yellow/green/orange
 * - Green/Purple/Orange: only their matching slot
 * - Moon/Sun: only their matching slot
 */
const AUGMENT_SLOT_COMPATIBILITY: Record<string, string[]> = {
  'blue': ['blue', 'green', 'purple'],
  'red': ['red', 'purple', 'orange'],
  'yellow': ['yellow', 'green', 'orange'],
  'colorless': ['blue', 'yellow', 'red', 'green', 'purple', 'orange'],
  'green': ['green'],
  'purple': ['purple'],
  'orange': ['orange'],
  'moon': ['moon'],
  'sun': ['sun']
}

/**
 * Check if an augment can be slotted into a given slot type
 * @param augmentColor The color of the augment (from the augment name, e.g., "Sapphire" = blue)
 * @param slotColor The color of the slot (from slot type name)
 * @returns true if the augment can fit in the slot
 */
export function canAugmentFitInSlot(augmentColor: string, slotColor: string): boolean {
  const compatibleSlots = AUGMENT_SLOT_COMPATIBILITY[augmentColor.toLowerCase()]
  if (!compatibleSlots) return false
  return compatibleSlots.includes(slotColor.toLowerCase())
}

/**
 * Determine the augment color from an augment name
 * Uses naming conventions: Sapphire=blue, Ruby=red, Topaz=yellow, etc.
 */
export function getAugmentColorFromName(augmentName: string): string | undefined {
  const lower = augmentName.toLowerCase()

  // Colorless augments
  if (lower.includes('colorless') || lower.includes('set augment')) return 'colorless'

  // Blue augments (Sapphire)
  if (lower.includes('sapphire')) return 'blue'

  // Red augments (Ruby)
  if (lower.includes('ruby')) return 'red'

  // Yellow augments (Topaz)
  if (lower.includes('topaz')) return 'yellow'

  // Green augments (Emerald)
  if (lower.includes('emerald')) return 'green'

  // Purple augments (Amethyst)
  if (lower.includes('amethyst')) return 'purple'

  // Orange augments (Citrine)
  if (lower.includes('citrine')) return 'orange'

  // Moon augments
  if (lower.includes('moon')) return 'moon'

  // Sun augments
  if (lower.includes('sun')) return 'sun'

  // Diamond = colorless
  if (lower.includes('diamond')) return 'colorless'

  return undefined
}

/**
 * Get available crafting options for a specific slot type and item
 * For augment slots, this includes compatible augments from other slot types
 * (e.g., colorless augments can go in blue/yellow/red/green/purple/orange slots)
 *
 * @param craftingData The full crafting data
 * @param slotType The crafting slot type (e.g., "Blue Augment Slot")
 * @param itemName The item name to check for item-specific options
 * @returns Array of available crafting options
 */
export function getAvailableCraftingOptions(
  craftingData: CraftingData | null,
  slotType: string,
  itemName: string
): CraftingOption[] {
  if (!craftingData) return []

  const slotData = craftingData[slotType]
  if (!slotData) return []

  // Get base options for this slot type
  let options: CraftingOption[] = []

  // Check item-specific options first
  if (slotData[itemName] && slotData[itemName].length > 0) {
    options = [...slotData[itemName]]
  } else if (slotData['*']) {
    // Fall back to universal options
    options = [...slotData['*']]
  }

  // For augment slots, also include compatible augments from other slot types
  const slotColor = getAugmentSlotColor(slotType)
  if (slotColor && isAugmentSlot(slotType)) {
    // Find which augment colors can fit in this slot
    const compatibleColors: string[] = []
    for (const [augmentColor, compatibleSlots] of Object.entries(AUGMENT_SLOT_COMPATIBILITY)) {
      if (compatibleSlots.includes(slotColor) && augmentColor !== slotColor) {
        compatibleColors.push(augmentColor)
      }
    }

    // Add augments from compatible slot types
    for (const compatibleColor of compatibleColors) {
      const compatibleSlotType = `${compatibleColor.charAt(0).toUpperCase()}${compatibleColor.slice(1)} Augment Slot`
      const compatibleSlotData = craftingData[compatibleSlotType]
      if (compatibleSlotData) {
        const compatibleOptions = compatibleSlotData[itemName] || compatibleSlotData['*'] || []
        options = [...options, ...compatibleOptions]
      }
    }
  }

  return options
}

/**
 * Filter crafting options by ML requirement
 *
 * @param options Available crafting options
 * @param maxML Maximum ML allowed (typically the item's ML)
 * @returns Filtered options where option ML <= maxML
 */
export function filterCraftingOptionsByML(
  options: CraftingOption[],
  maxML: number
): CraftingOption[] {
  return options.filter(option => {
    // Options without ML requirement are always available
    if (option.ml === undefined) return true
    return option.ml <= maxML
  })
}

/**
 * Score a crafting option based on how well it matches selected properties
 *
 * @param option The crafting option to score
 * @param selectedProperties Properties to optimize for (in priority order)
 * @returns Score value (higher is better)
 */
export function scoreCraftingOption(
  option: CraftingOption,
  selectedProperties: string[]
): number {
  if (!option.affixes || option.affixes.length === 0) {
    return 0
  }

  let score = 0

  option.affixes.forEach(affix => {
    // Skip boolean affixes for scoring
    if (affix.type === 'bool') return

    const propertyIndex = selectedProperties.indexOf(affix.name)
    if (propertyIndex === -1) return

    const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
    if (isNaN(value)) return

    // Weight by property priority (first property = highest weight)
    const priorityWeight = selectedProperties.length - propertyIndex
    score += value * priorityWeight
  })

  return score
}

/**
 * Find the best crafting option for a slot based on selected properties
 *
 * @param craftingData The full crafting data
 * @param slotType The crafting slot type
 * @param itemName The item name
 * @param itemML The item's minimum level
 * @param selectedProperties Properties to optimize for
 * @returns The best option, or null if no valid options
 */
export function findBestCraftingOption(
  craftingData: CraftingData | null,
  slotType: string,
  itemName: string,
  itemML: number,
  selectedProperties: string[]
): CraftingOption | null {
  // Skip random slots
  if (isRandomSlot(slotType)) {
    return null
  }

  const options = getAvailableCraftingOptions(craftingData, slotType, itemName)
  const validOptions = filterCraftingOptionsByML(options, itemML)

  if (validOptions.length === 0) {
    return null
  }

  // Score all options
  let bestOption: CraftingOption | null = null
  let bestScore = -1

  for (const option of validOptions) {
    const score = scoreCraftingOption(option, selectedProperties)
    if (score > bestScore) {
      bestScore = score
      bestOption = option
    }
  }

  return bestOption
}

/**
 * Represents a selected crafting option for an item slot
 */
export interface SelectedCraftingOption {
  slotType: string
  option: CraftingOption | null
}

/**
 * Represents all crafting selections for a gear setup
 * Key is the gear slot (armor, ring1, etc.), value is array of crafting selections
 */
export type GearCraftingSelections = Record<string, SelectedCraftingOption[]>

/**
 * Auto-select the best crafting options for all slots on an item
 * NOTE: This is a basic version that selects independently per item.
 * Use autoSelectCraftingOptionsForGearSetup for smarter stacking-aware selection.
 *
 * @param item The item to select options for
 * @param craftingData The full crafting data
 * @param selectedProperties Properties to optimize for
 * @returns Array of selected crafting options
 */
export function autoSelectCraftingOptions(
  item: Item,
  craftingData: CraftingData | null,
  selectedProperties: string[]
): SelectedCraftingOption[] {
  if (!item.crafting || item.crafting.length === 0) {
    return []
  }

  return item.crafting.map(slotType => ({
    slotType,
    option: findBestCraftingOption(
      craftingData,
      slotType,
      item.name,
      item.ml,
      selectedProperties
    )
  }))
}

/**
 * Represents an augment slot candidate for global optimization
 */
interface AugmentSlotCandidate {
  gearSlot: string
  slotIndex: number
  slotType: string
  item: Item
  option: CraftingOption
  score: number
  affixes: ItemAffix[]
}

/**
 * Track which property+bonusType combinations are already covered
 */
type CoveredBonuses = Map<string, Map<string, number>> // property -> bonusType -> value

/**
 * Check if an augment provides any NEW value (not already covered by higher bonuses)
 */
function getAugmentNewValue(
  affixes: ItemAffix[],
  selectedProperties: string[],
  coveredBonuses: CoveredBonuses
): number {
  let newValue = 0

  for (const affix of affixes) {
    if (affix.type === 'bool') continue
    if (!selectedProperties.includes(affix.name)) continue

    const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
    if (isNaN(value)) continue

    const bonusType = affix.type || 'Untyped'
    const propertyBonuses = coveredBonuses.get(affix.name)
    const existingValue = propertyBonuses?.get(bonusType) ?? 0

    // Only count value if it's higher than what we already have
    if (value > existingValue) {
      newValue += (value - existingValue)
    }
  }

  return newValue
}

/**
 * Mark affixes as covered in the tracking map
 */
function markAffixesCovered(
  affixes: ItemAffix[],
  selectedProperties: string[],
  coveredBonuses: CoveredBonuses
): void {
  for (const affix of affixes) {
    if (affix.type === 'bool') continue
    if (!selectedProperties.includes(affix.name)) continue

    const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
    if (isNaN(value)) continue

    const bonusType = affix.type || 'Untyped'

    if (!coveredBonuses.has(affix.name)) {
      coveredBonuses.set(affix.name, new Map())
    }

    const propertyBonuses = coveredBonuses.get(affix.name)!
    const existingValue = propertyBonuses.get(bonusType) ?? 0

    // Only update if this value is higher
    if (value > existingValue) {
      propertyBonuses.set(bonusType, value)
    }
  }
}

/**
 * Auto-select crafting options for an entire gear setup, respecting affix stacking rules.
 * This ensures we don't slot redundant augments that provide the same bonus type for the same property.
 *
 * @param gearSetup Map of gear slot to item
 * @param craftingData The full crafting data
 * @param selectedProperties Properties to optimize for
 * @param baseAffixes Affixes already provided by items (to avoid duplicating)
 * @returns GearCraftingSelections with optimal non-redundant augment choices
 */
export function autoSelectCraftingOptionsForGearSetup(
  gearSetup: Record<string, Item | undefined>,
  craftingData: CraftingData | null,
  selectedProperties: string[],
  baseAffixes: ItemAffix[]
): GearCraftingSelections {
  const slotKeys = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Initialize result with empty arrays for each slot
  const result: GearCraftingSelections = {}

  // Track what bonuses are already covered by base item affixes
  const coveredBonuses: CoveredBonuses = new Map()
  markAffixesCovered(baseAffixes, selectedProperties, coveredBonuses)

  // Collect all crafting slot candidates (both augments and affix selection slots)
  // We'll process them all together to respect stacking rules
  const craftingCandidates: AugmentSlotCandidate[] = []

  for (const slotKey of slotKeys) {
    const item = gearSetup[slotKey]
    if (!item || !item.crafting) {
      result[slotKey] = []
      continue
    }

    // Initialize selections array for this slot
    result[slotKey] = item.crafting.map(slotType => ({
      slotType,
      option: null
    }))

    // Process each crafting slot
    for (let i = 0; i < item.crafting.length; i++) {
      const slotType = item.crafting[i]

      // Skip random slots
      if (isRandomSlot(slotType)) {
        continue
      }

      // For set bonus slots, just pick the best option directly (they don't have stacking issues)
      if (isSetBonusSlot(slotType)) {
        const bestOption = findBestCraftingOption(
          craftingData,
          slotType,
          item.name,
          item.ml,
          selectedProperties
        )
        result[slotKey][i].option = bestOption
        // Mark these affixes as covered
        if (bestOption?.affixes) {
          markAffixesCovered(bestOption.affixes, selectedProperties, coveredBonuses)
        }
        continue
      }

      // For augment slots AND affix selection slots, collect as candidates
      // This ensures we don't slot multiple Dolorous/Melancholic with same bonus type
      const options = getAvailableCraftingOptions(craftingData, slotType, item.name)
      const validOptions = filterCraftingOptionsByML(options, item.ml)

      for (const option of validOptions) {
        if (!option.affixes || option.affixes.length === 0) continue

        const score = scoreCraftingOption(option, selectedProperties)
        if (score <= 0) continue

        craftingCandidates.push({
          gearSlot: slotKey,
          slotIndex: i,
          slotType,
          item,
          option,
          score,
          affixes: option.affixes
        })
      }
    }
  }

  // Sort candidates by score (highest first)
  craftingCandidates.sort((a, b) => b.score - a.score)

  // Track which slots have been filled
  const filledSlots = new Set<string>() // "gearSlot:slotIndex"

  // Greedily select crafting options that provide new value
  for (const candidate of craftingCandidates) {
    const slotKey = `${candidate.gearSlot}:${candidate.slotIndex}`

    // Skip if this slot is already filled
    if (filledSlots.has(slotKey)) continue

    // Check if this augment provides any new value
    const newValue = getAugmentNewValue(candidate.affixes, selectedProperties, coveredBonuses)

    if (newValue > 0) {
      // Select this augment
      result[candidate.gearSlot][candidate.slotIndex].option = candidate.option
      filledSlots.add(slotKey)

      // Mark its affixes as covered
      markAffixesCovered(candidate.affixes, selectedProperties, coveredBonuses)
    }
  }

  return result
}

/**
 * Get all affixes from selected crafting options
 */
export function getCraftingAffixes(selections: SelectedCraftingOption[]): ItemAffix[] {
  const affixes: ItemAffix[] = []

  for (const selection of selections) {
    if (selection.option?.affixes) {
      affixes.push(...selection.option.affixes)
    }
  }

  return affixes
}

/**
 * Get all set memberships from selected crafting options (for Set Augments)
 */
export function getCraftingSetMemberships(selections: SelectedCraftingOption[]): string[] {
  const sets: string[] = []

  for (const selection of selections) {
    if (selection.option?.set) {
      sets.push(selection.option.set)
    }
  }

  return sets
}

/**
 * Count augment slots - total and used (where an option provides affixes for selected properties)
 */
export function countAugmentSlots(
  item: Item,
  selections: SelectedCraftingOption[],
  selectedProperties: string[]
): { total: number; used: number } {
  if (!item.crafting) {
    return { total: 0, used: 0 }
  }

  let total = 0
  let used = 0

  for (let i = 0; i < item.crafting.length; i++) {
    const slotType = item.crafting[i]

    if (!isAugmentSlot(slotType)) {
      continue
    }

    total++

    // Check if this slot is "used" (has an option that contributes to selected properties)
    const selection = selections[i]
    if (selection?.option?.affixes) {
      const contributesToSelected = selection.option.affixes.some(affix =>
        affix.type !== 'bool' && selectedProperties.includes(affix.name)
      )
      if (contributesToSelected) {
        used++
      }
    }
  }

  return { total, used }
}
