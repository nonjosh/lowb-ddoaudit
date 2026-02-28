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
  'Bleak Wire',
  'Bleak Transformer',
] as const

/** Legendary ingredients (ML 34 augments) */
export const LEGENDARY_INGREDIENTS = [
  'Legendary Bleak Alternator',
  'Legendary Bleak Conductor',
  'Legendary Bleak Insulator',
  'Legendary Bleak Resistor',
  'Legendary Bleak Wire',
  'Legendary Bleak Transformer',
] as const

export const ALL_VIKTRANIUM_INGREDIENTS = [
  ...HEROIC_INGREDIENTS,
  ...LEGENDARY_INGREDIENTS,
] as const

export type ViktraniumIngredient = (typeof ALL_VIKTRANIUM_INGREDIENTS)[number]

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

export interface SlotIngredientConfig {
  heroic: Array<{ ingredient: string; count: number }>
  legendary: Array<{ ingredient: string; count: number }>
}

const createHeroicBase4 = (n: number) => [
  { ingredient: 'Bleak Alternator', count: n },
  { ingredient: 'Bleak Conductor', count: n },
  { ingredient: 'Bleak Insulator', count: n },
  { ingredient: 'Bleak Resistor', count: n },
]
const createLegendaryBase4 = (n: number) => [
  { ingredient: 'Legendary Bleak Alternator', count: n },
  { ingredient: 'Legendary Bleak Conductor', count: n },
  { ingredient: 'Legendary Bleak Insulator', count: n },
  { ingredient: 'Legendary Bleak Resistor', count: n },
]

export const SLOT_INGREDIENT_CONFIGS: Record<ViktraniumSlotType, SlotIngredientConfig> = {
  'Melancholic (Accessory)': { heroic: createHeroicBase4(5), legendary: createLegendaryBase4(25) },
  'Melancholic (Weapon)': { heroic: createHeroicBase4(5), legendary: createLegendaryBase4(25) },
  'Melancholic (Armor)': {
    heroic: [...createHeroicBase4(5), { ingredient: 'Bleak Wire', count: 20 }],
    legendary: [...createLegendaryBase4(25), { ingredient: 'Legendary Bleak Wire', count: 100 }],
  },
  'Dolorous (Accessory)': { heroic: createHeroicBase4(10), legendary: createLegendaryBase4(50) },
  'Dolorous (Weapon)': { heroic: createHeroicBase4(10), legendary: createLegendaryBase4(50) },
  'Dolorous (Armor)': { heroic: createHeroicBase4(10), legendary: createLegendaryBase4(50) },
  'Miserable (Accessory)': {
    heroic: [...createHeroicBase4(5), { ingredient: 'Bleak Wire', count: 20 }],
    legendary: [...createLegendaryBase4(25), { ingredient: 'Legendary Bleak Wire', count: 100 }],
  },
  'Miserable (Weapon)': {
    heroic: [...createHeroicBase4(5), { ingredient: 'Bleak Wire', count: 20 }],
    legendary: [...createLegendaryBase4(25), { ingredient: 'Legendary Bleak Wire', count: 100 }],
  },
  'Woeful (Accessory)': {
    heroic: [...createHeroicBase4(10), { ingredient: 'Bleak Transformer', count: 10 }],
    legendary: [...createLegendaryBase4(50), { ingredient: 'Legendary Bleak Transformer', count: 50 }],
  },
  'Woeful (Weapon)': {
    heroic: [...createHeroicBase4(10), { ingredient: 'Bleak Transformer', count: 10 }],
    legendary: [...createLegendaryBase4(50), { ingredient: 'Legendary Bleak Transformer', count: 50 }],
  },
}

/**
 * Calculate total ingredient requirements for a list of selected augments.
 * Costs vary by slot type; ML determines heroic vs legendary ingredients.
 */
export function calculateViktraniumIngredients(
  selectedAugments: Array<{ slotType: ViktraniumSlotType; ml?: number }>,
): IngredientSummary {
  const summary: IngredientSummary = {}

  for (const augment of selectedAugments) {
    const config = SLOT_INGREDIENT_CONFIGS[augment.slotType]
    const ingredientList = isLegendaryAugment(augment.ml) ? config.legendary : config.heroic
    for (const { ingredient, count } of ingredientList) {
      summary[ingredient] = (summary[ingredient] ?? 0) + count
    }
  }

  return summary
}
