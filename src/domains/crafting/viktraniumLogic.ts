import type { CraftingData, CraftingOption, Item } from '@/api/ddoGearPlanner'

// ============================================================================
// Constants
// ============================================================================

export const VIKTRANIUM_SLOT_TYPES = [
  'Melancholic (Accessory)',
  'Melancholic (Armor)',
  'Melancholic (Weapon)',
  'Dolorous (Accessory)',
  'Dolorous (Armor)',
  'Dolorous (Weapon)',
  'Miserable (Accessory)',
  'Miserable (Weapon)',
  'Woeful (Accessory)',
  'Woeful (Weapon)',
] as const

export type ViktraniumSlotType = (typeof VIKTRANIUM_SLOT_TYPES)[number]

/** Heroic ingredients (ML 8 augments) */
export const HEROIC_INGREDIENTS = [
  'Bleak Alternator',
  'Bleak Conductor',
  'Bleak Insulator',
  'Bleak Resistor',
] as const

/** Legendary ingredients (ML 34 augments) */
export const LEGENDARY_INGREDIENTS = [
  'Legendary Bleak Alternator',
  'Legendary Bleak Conductor',
  'Legendary Bleak Insulator',
  'Legendary Bleak Resistor',
] as const

export const ALL_VIKTRANIUM_INGREDIENTS = [
  ...HEROIC_INGREDIENTS,
  ...LEGENDARY_INGREDIENTS,
] as const

export type ViktraniumIngredient = (typeof ALL_VIKTRANIUM_INGREDIENTS)[number]

/** Number of each ingredient required per augment */
export const INGREDIENTS_PER_AUGMENT = 5

/** ML threshold separating heroic from legendary augments */
export const LEGENDARY_ML_THRESHOLD = 20

// ============================================================================
// Helpers
// ============================================================================

export function isViktraniumSlot(slotType: string): slotType is ViktraniumSlotType {
  return VIKTRANIUM_SLOT_TYPES.includes(slotType as ViktraniumSlotType)
}

export function isLegendaryAugment(ml: number | undefined): boolean {
  return (ml ?? 0) > LEGENDARY_ML_THRESHOLD
}

/**
 * Returns true if the item has at least one Viktranium crafting slot.
 */
export function hasViktraniumSlots(item: Item): boolean {
  return (item.crafting ?? []).some(isViktraniumSlot)
}

/**
 * Returns all Viktranium slot types present on an item.
 */
export function getViktraniumSlots(item: Item): ViktraniumSlotType[] {
  return (item.crafting ?? []).filter(isViktraniumSlot) as ViktraniumSlotType[]
}

// ============================================================================
// Crafting Options
// ============================================================================

/**
 * Get all available augment options for a given Viktranium slot type.
 * Options are sourced from the global '*' key in crafting data.
 */
export function getAugmentOptions(
  slotType: ViktraniumSlotType,
  craftingData: CraftingData,
  heroic: boolean,
): CraftingOption[] {
  const options = craftingData[slotType]?.['*'] ?? []
  return options.filter((opt) =>
    heroic ? !isLegendaryAugment(opt.ml) : isLegendaryAugment(opt.ml),
  )
}

// ============================================================================
// Ingredient Calculation
// ============================================================================

export interface IngredientSummary {
  [ingredient: string]: number
}

/**
 * Calculate total ingredient requirements for a list of selected augments
 * (each represented by its ML value to determine heroic vs legendary).
 */
export function calculateViktraniumIngredients(
  selectedAugments: Array<{ ml?: number }>,
): IngredientSummary {
  const summary: IngredientSummary = {}

  for (const ingredient of ALL_VIKTRANIUM_INGREDIENTS) {
    summary[ingredient] = 0
  }

  for (const augment of selectedAugments) {
    const ingredients = isLegendaryAugment(augment.ml)
      ? LEGENDARY_INGREDIENTS
      : HEROIC_INGREDIENTS
    for (const ingredient of ingredients) {
      summary[ingredient] = (summary[ingredient] ?? 0) + INGREDIENTS_PER_AUGMENT
    }
  }

  return summary
}
