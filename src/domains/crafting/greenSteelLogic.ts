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

// ============================================================================
// Effects
// ============================================================================

export interface GreenSteelEffect {
  name: string
  description: string
  category: 'Spell Power' | 'Stat' | 'Resistance' | 'Lore' | 'Weapon Bonus' | 'Active'
  element: GreenSteelElement
  essenceType: EssenceType
  gemType: GemType
}

export const GREEN_STEEL_EFFECTS: GreenSteelEffect[] = [
  { name: 'Glaciation', description: 'Cold Spell Power +72/+90/+108', category: 'Spell Power', element: 'Water', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Combustion', description: 'Fire Spell Power +72/+90/+108', category: 'Spell Power', element: 'Fire', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Corrosion', description: 'Acid Spell Power +72/+90/+108', category: 'Spell Power', element: 'Earth', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Magnetism', description: 'Electric Spell Power +72/+90/+108', category: 'Spell Power', element: 'Air', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Radiance', description: 'Light Spell Power +72/+90/+108', category: 'Spell Power', element: 'Positive', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Impulse', description: 'Force/Universal Spell Power +72/+90/+108', category: 'Spell Power', element: 'Positive', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Devotion', description: 'Positive/Repair Spell Power +72/+90/+108', category: 'Spell Power', element: 'Positive', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Nihil', description: 'Negative Energy Spell Power +72/+90/+108', category: 'Spell Power', element: 'Negative', essenceType: 'Ethereal', gemType: 'Dominion' },
  { name: 'Cold Lore', description: 'Cold Spell Critical Chance', category: 'Lore', element: 'Water', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Fire Lore', description: 'Fire Spell Critical Chance', category: 'Lore', element: 'Fire', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Acid Lore', description: 'Acid Spell Critical Chance', category: 'Lore', element: 'Earth', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Electric Lore', description: 'Electric Spell Critical Chance', category: 'Lore', element: 'Air', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Light Lore', description: 'Light Spell Critical Chance', category: 'Lore', element: 'Positive', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Negative Lore', description: 'Negative Energy Spell Critical Chance', category: 'Lore', element: 'Negative', essenceType: 'Ethereal', gemType: 'Escalation' },
  { name: 'Cold Resistance', description: 'Cold Resistance +28', category: 'Resistance', element: 'Water', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Fire Resistance', description: 'Fire Resistance +28', category: 'Resistance', element: 'Fire', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Acid Resistance', description: 'Acid Resistance +28', category: 'Resistance', element: 'Earth', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Electric Resistance', description: 'Electric Resistance +28', category: 'Resistance', element: 'Air', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Deathblock', description: 'Deathblock (immunity to death spells)', category: 'Resistance', element: 'Negative', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'False Life', description: '+30/+40/+50 HP', category: 'Stat', element: 'Water', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Strength', description: '+3/+4/+5 Strength', category: 'Stat', element: 'Fire', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Constitution', description: '+3/+4/+5 Constitution', category: 'Stat', element: 'Earth', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Dexterity', description: '+3/+4/+5 Dexterity', category: 'Stat', element: 'Air', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Wisdom', description: '+3/+4/+5 Wisdom', category: 'Stat', element: 'Positive', essenceType: 'Material', gemType: 'Escalation' },
  { name: 'Charisma', description: '+3/+4/+5 Charisma', category: 'Stat', element: 'Negative', essenceType: 'Material', gemType: 'Dominion' },
  { name: 'Intelligence', description: '+3/+4/+5 Intelligence', category: 'Stat', element: 'Air', essenceType: 'Material', gemType: 'Escalation' },
  { name: 'Feather Falling', description: 'Feather Falling', category: 'Stat', element: 'Air', essenceType: 'Material', gemType: 'Opposition' },
  { name: 'Icy Burst', description: 'Icy Burst on-hit + Cold damage', category: 'Weapon Bonus', element: 'Water', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Flaming Burst', description: 'Flaming Burst on-hit + Fire damage', category: 'Weapon Bonus', element: 'Fire', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Shocking Burst', description: 'Shocking Burst on-hit + Electric damage', category: 'Weapon Bonus', element: 'Air', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Corrosive', description: 'Corroding on-hit + Acid damage', category: 'Weapon Bonus', element: 'Earth', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Disruption', description: 'Disruption (vs undead)', category: 'Weapon Bonus', element: 'Positive', essenceType: 'Ethereal', gemType: 'Opposition' },
  { name: 'Smiting', description: 'Smiting (vs constructs)', category: 'Weapon Bonus', element: 'Earth', essenceType: 'Material', gemType: 'Opposition' },
  { name: 'Banishing', description: 'Banishing (vs outsiders)', category: 'Weapon Bonus', element: 'Positive', essenceType: 'Material', gemType: 'Opposition' },
  { name: 'Vorpal', description: 'Vorpal (instant kill on 20)', category: 'Weapon Bonus', element: 'Negative', essenceType: 'Material', gemType: 'Opposition' },
]

export function getEffectByName(name: string): GreenSteelEffect | undefined {
  return GREEN_STEEL_EFFECTS.find((e) => e.name === name)
}

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
  effectName: string | null
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
    if (!sel.effectName) continue
    const effect = getEffectByName(sel.effectName)
    if (!effect) continue

    const { essence, gem, cell } = getTierIngredients(sel.tier, effect.essenceType, effect.gemType)

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
  if (!sel.effectName) return '(not selected)'
  const effect = getEffectByName(sel.effectName)
  if (!effect) return sel.effectName
  return `${effect.name} — ${effect.element} / ${effect.essenceType} / ${effect.gemType}`
}
