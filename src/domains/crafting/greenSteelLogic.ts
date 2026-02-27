// ============================================================================
// Green Steel Crafting Logic
// ============================================================================
// Based on: https://ddowiki.com/page/Green_Steel_items
// ============================================================================

// ============================================================================
// Elements and Effects
// ============================================================================

export type GreenSteelElement = 'Water' | 'Fire' | 'Earth' | 'Air' | 'Positive' | 'Negative'

export const GREEN_STEEL_ELEMENTS: GreenSteelElement[] = [
  'Water',
  'Fire',
  'Earth',
  'Air',
  'Positive',
  'Negative',
]

// ============================================================================
// Essence & Gem Types
// ============================================================================

export type EssenceType = 'Ethereal' | 'Material'
export type GemType = 'Opposition' | 'Dominion' | 'Escalation'

/**
 * Tier-based prefix for essence and gem items.
 * Tier 1 = Diluted/Cloudy, Tier 2 = Distilled/Pristine, Tier 3 = Pure/Flawless
 */
export const TIER_ESSENCE_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Diluted',
  2: 'Distilled',
  3: 'Pure',
}

export const TIER_GEM_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Cloudy',
  2: 'Pristine',
  3: 'Flawless',
}

export const TIER_ENERGY_CELL: Record<1 | 2 | 3, string> = {
  1: 'Shavarath Low Energy Cell',
  2: 'Shavarath Medium Energy Cell',
  3: 'Shavarath High Energy Cell',
}

/** Number of essences and gems required per tier upgrade */
export const INGREDIENTS_PER_TIER = 3

// ============================================================================
// Item Types
// ============================================================================

export type GreenSteelItemType = 'Weapon' | 'Accessory'

export const GREEN_STEEL_WEAPON_TYPES = [
  'Bastard Sword',
  'Battle Axe',
  'Club',
  'Dagger',
  'Falchion',
  'Great Axe',
  'Great Club',
  'Great Sword',
  'Hand Axe',
  'Handwrap',
  'Heavy Mace',
  'Heavy Pick',
  'Khopesh',
  'Kama',
  'Kukri',
  'Light Hammer',
  'Light Mace',
  'Light Pick',
  'Long Sword',
  'Maul',
  'Morningstar',
  'Quarterstaff',
  'Rapier',
  'Scimitar',
  'Shortsword',
  'Sickle',
  'War Hammer',
] as const

export const GREEN_STEEL_ACCESSORY_TYPES = [
  'Belt',
  'Boots',
  'Bracers',
  'Cloak',
  'Gloves',
  'Goggles',
  'Hat',
  'Necklace',
  'Ring',
] as const

// ============================================================================
// Tier Selection
// ============================================================================

export type GreenSteelTier = 1 | 2 | 3

export interface GreenSteelTierSelection {
  tier: GreenSteelTier
  element: GreenSteelElement | null
  essenceType: EssenceType
  gemType: GemType
}

// ============================================================================
// Ingredient Calculation
// ============================================================================

export interface GreenSteelIngredientSummary {
  [ingredient: string]: number
}

/**
 * Get the ingredient names for a given tier + essence + gem combination.
 */
export function getTierIngredients(
  tier: GreenSteelTier,
  essenceType: EssenceType,
  gemType: GemType,
): { essence: string; gem: string; cell: string } {
  const essencePrefix = TIER_ESSENCE_PREFIX[tier]
  const gemPrefix = TIER_GEM_PREFIX[tier]
  const cell = TIER_ENERGY_CELL[tier]
  return {
    essence: `${essencePrefix} ${essenceType} Essence`,
    gem: `${gemPrefix} Gem of ${gemType}`,
    cell,
  }
}

/**
 * Calculate total ingredient requirements for a set of tier selections.
 * Each filled tier requires INGREDIENTS_PER_TIER essences + INGREDIENTS_PER_TIER gems + 1 energy cell.
 */
export function calculateGreenSteelIngredients(
  selections: GreenSteelTierSelection[],
): GreenSteelIngredientSummary {
  const summary: GreenSteelIngredientSummary = {}

  for (const sel of selections) {
    if (!sel.element) continue

    const { essence, gem, cell } = getTierIngredients(sel.tier, sel.essenceType, sel.gemType)

    summary[essence] = (summary[essence] ?? 0) + INGREDIENTS_PER_TIER
    summary[gem] = (summary[gem] ?? 0) + INGREDIENTS_PER_TIER
    summary[cell] = (summary[cell] ?? 0) + 1
  }

  return summary
}

/**
 * Returns a label describing the planned effect combination for a tier.
 */
export function getTierLabel(sel: GreenSteelTierSelection): string {
  if (!sel.element) return '(not selected)'
  return `${sel.element} — ${sel.essenceType} / ${sel.gemType}`
}
