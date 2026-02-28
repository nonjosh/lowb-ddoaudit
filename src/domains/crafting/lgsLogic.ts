// ============================================================================
// Legendary Green Steel (LGS) Crafting Logic
// ============================================================================
// Based on: https://ddowiki.com/page/Legendary_Green_Steel_items
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_1
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_2
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_3
// ============================================================================

import type { EssenceType, GemType, GreenSteelElement, GreenSteelIngredientSummary, GreenSteelTierSelection, WeaponBonusEffect } from './greenSteelLogic'
import { getEffectByName, getFocusName } from './greenSteelLogic'

// ============================================================================
// LGS Raw Ingredient Names (6 base ingredients from Legendary Shroud)
// ============================================================================

/** The 6 raw ingredient base names that drop from Legendary Shroud */
export const LGS_RAW_INGREDIENTS = [
  'Glowing Arrowhead',
  'Gnawed Bone',
  'Twisted Shrapnel',
  'Length of Infernal Chain',
  'Sulfurous Stone',
  'Devil Scales',
] as const

export type LgsRawIngredient = typeof LGS_RAW_INGREDIENTS[number]

// ============================================================================
// Raw Ingredient Recipe Tables
// ============================================================================
// Each manufactured ingredient (Focus, Essence, Gem) requires 4 of the 6
// raw ingredients. The same recipe pattern is used across all tiers;
// only the size prefix (Small/Medium/Large) changes.

/** Which raw ingredients are needed for each Focus element */
export const LGS_FOCUS_RECIPES: Record<GreenSteelElement, LgsRawIngredient[]> = {
  Air: ['Glowing Arrowhead', 'Gnawed Bone', 'Twisted Shrapnel', 'Sulfurous Stone'],
  Earth: ['Glowing Arrowhead', 'Gnawed Bone', 'Twisted Shrapnel', 'Length of Infernal Chain'],
  Fire: ['Glowing Arrowhead', 'Gnawed Bone', 'Twisted Shrapnel', 'Devil Scales'],
  Water: ['Glowing Arrowhead', 'Gnawed Bone', 'Length of Infernal Chain', 'Devil Scales'],
  Negative: ['Glowing Arrowhead', 'Twisted Shrapnel', 'Length of Infernal Chain', 'Sulfurous Stone'],
  Positive: ['Glowing Arrowhead', 'Gnawed Bone', 'Sulfurous Stone', 'Devil Scales'],
}

/** Which raw ingredients are needed for each Essence type */
export const LGS_ESSENCE_RECIPES: Record<EssenceType, LgsRawIngredient[]> = {
  Ethereal: ['Glowing Arrowhead', 'Length of Infernal Chain', 'Sulfurous Stone', 'Devil Scales'],
  Material: ['Glowing Arrowhead', 'Twisted Shrapnel', 'Sulfurous Stone', 'Devil Scales'],
}

/** Which raw ingredients are needed for each Gem type */
export const LGS_GEM_RECIPES: Record<GemType, LgsRawIngredient[]> = {
  Dominion: ['Gnawed Bone', 'Twisted Shrapnel', 'Length of Infernal Chain', 'Devil Scales'],
  Escalation: ['Twisted Shrapnel', 'Length of Infernal Chain', 'Sulfurous Stone', 'Devil Scales'],
  Opposition: ['Gnawed Bone', 'Length of Infernal Chain', 'Sulfurous Stone', 'Devil Scales'],
}

// ============================================================================
// LGS Size, Energy Cell, and CoV Constants
// ============================================================================

export const LGS_SIZE_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Small',
  2: 'Medium',
  3: 'Large',
}

export const LGS_ENERGY_CELL: Record<1 | 2 | 3, string> = {
  1: 'Legendary Low Energy Cell',
  2: 'Legendary Medium Energy Cell',
  3: 'Legendary High Energy Cell',
}

/** Commendation of Valor cost per Focus, by tier */
export const LGS_COV_PER_TIER: Record<1 | 2 | 3, number> = {
  1: 25,
  2: 50,
  3: 100,
}

// ============================================================================
// LGS Tier-specific Manufactured Ingredient Prefixes
// ============================================================================
// LGS Tier 2 uses NO prefix (unlike GS which uses Distilled/Pristine).
// Tier 1 and 3 share the same prefixes as GS.

export const LGS_TIER_ESSENCE_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Diluted',
  2: '',
  3: 'Pure',
}

export const LGS_TIER_GEM_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Cloudy',
  2: '',
  3: 'Flawless',
}

// ============================================================================
// Ingredient Name Helpers
// ============================================================================

/** Get the full name of a raw ingredient with tier size prefix */
export function getLgsRawIngredientName(tier: 1 | 2 | 3, ingredient: LgsRawIngredient): string {
  return `Legendary ${LGS_SIZE_PREFIX[tier]} ${ingredient}`
}

// ============================================================================
// Ingredient Calculation
// ============================================================================

/**
 * Calculate total LGS raw ingredient requirements for a set of tier selections.
 *
 * Each tier slot requires crafting 3 manufactured ingredients (Focus + Essence + Gem),
 * each of which requires 4 of the 6 raw ingredients (1 each). Focuses also require
 * Commendation of Valor. An Energy Cell is consumed when applying the tier.
 */
export function calculateLgsIngredients(
  selections: GreenSteelTierSelection[],
): GreenSteelIngredientSummary {
  const summary: GreenSteelIngredientSummary = {}

  for (const sel of selections) {
    if (!sel.effectName) continue
    const effect = getEffectByName(sel.effectName)
    if (!effect) continue

    const tier = sel.tier as 1 | 2 | 3

    // Focus raw ingredients (4 per focus)
    for (const ingredient of LGS_FOCUS_RECIPES[effect.element]) {
      const name = getLgsRawIngredientName(tier, ingredient)
      summary[name] = (summary[name] ?? 0) + 1
    }

    // Commendation of Valor for the Focus
    summary['Commendation of Valor'] = (summary['Commendation of Valor'] ?? 0) + LGS_COV_PER_TIER[tier]

    // Essence raw ingredients (4 per essence)
    for (const ingredient of LGS_ESSENCE_RECIPES[effect.essenceType]) {
      const name = getLgsRawIngredientName(tier, ingredient)
      summary[name] = (summary[name] ?? 0) + 1
    }

    // Gem raw ingredients (4 per gem)
    for (const ingredient of LGS_GEM_RECIPES[effect.gemType]) {
      const name = getLgsRawIngredientName(tier, ingredient)
      summary[name] = (summary[name] ?? 0) + 1
    }

    // Energy cell
    const cell = LGS_ENERGY_CELL[tier]
    summary[cell] = (summary[cell] ?? 0) + 1
  }

  return summary
}

// ============================================================================
// LGS Focus Names
// ============================================================================

export function getLgsFocusName(tier: 1 | 2 | 3, element: GreenSteelElement): string {
  return `Legendary ${getFocusName(tier, element)}`
}

// ============================================================================
// LGS Crafting Steps Summary
// ============================================================================

export interface LgsCraftingStep {
  tier: 1 | 2 | 3
  focus: string
  essence: string
  gem: string
  cell: string
}

/**
 * Get the LGS manufactured ingredient names for the crafting steps display.
 * Uses LGS-specific tier prefixes (Tier 2 has no prefix, unlike GS).
 */
export function getLgsCraftingSteps(selections: GreenSteelTierSelection[]): LgsCraftingStep[] {
  return selections
    .filter((sel) => sel.effectName)
    .map((sel) => {
      const effect = getEffectByName(sel.effectName!)!
      const tier = sel.tier as 1 | 2 | 3
      const essencePrefix = LGS_TIER_ESSENCE_PREFIX[tier]
      const gemPrefix = LGS_TIER_GEM_PREFIX[tier]
      return {
        tier,
        focus: getLgsFocusName(tier, effect.element),
        essence: essencePrefix
          ? `Legendary ${essencePrefix} ${effect.essenceType} Essence`
          : `Legendary ${effect.essenceType} Essence`,
        gem: gemPrefix
          ? `Legendary ${gemPrefix} Gem of ${effect.gemType}`
          : `Legendary Gem of ${effect.gemType}`,
        cell: LGS_ENERGY_CELL[tier],
      }
    })
}

// ============================================================================
// LGS Weapon Bonus Effects (for weapons with all 3 tiers filled)
// Based on: https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_3#Weapon_bonus_effects
// ============================================================================

function elementPairKey(a: GreenSteelElement, b: GreenSteelElement): string {
  return [a, b].sort().join('+')
}

const LGS_PURE_WEAPON_BONUS: Record<GreenSteelElement, WeaponBonusEffect> = {
  Air: { name: 'Legendary Air Strike', description: 'Chance to deal ~2,000 (melee) / ~10,000 (spell) electrical damage' },
  Earth: { name: 'Legendary Earth', description: 'Stacking acid DoT (10d10/stack, max 5 stacks, ~275 avg at full)' },
  Fire: { name: 'Legendary Incineration', description: 'Chance to deal massive fire damage' },
  Water: { name: 'Legendary Water', description: 'Cold DoT stacks (20-30 dmg/stack, 10 stacks, ~250 at full)' },
  Positive: { name: 'Legendary Affirmation', description: '10-33% chance to grant 1,000 temp HP for 1 min (1 min CD)' },
  Negative: { name: 'Legendary Negation', description: '~33% chance to deal 1d3 Negative levels (30s CD)' },
}

const LGS_DUAL_WEAPON_BONUS: Record<string, WeaponBonusEffect> = {
  [elementPairKey('Air', 'Earth')]: { name: 'Legendary Tempered', description: '10-20% chance to deal extra acid and/or electric damage' },
  [elementPairKey('Air', 'Fire')]: { name: 'Legendary Smoke', description: '27% Enhancement bonus to Concealment' },
  [elementPairKey('Air', 'Negative')]: { name: 'Legendary Vacuum', description: '~30% chance to inflict 2-4 Vulnerable stacks' },
  [elementPairKey('Air', 'Positive')]: { name: 'Legendary Lightning', description: 'Creates lightning traps (~160-360 dmg) + 12d6 lightning on hit' },
  [elementPairKey('Air', 'Water')]: { name: 'Legendary Ice', description: '10-20% chance to freeze target (Fortitude save, AoE)' },
  [elementPairKey('Earth', 'Fire')]: { name: 'Legendary Magma', description: 'Fire DoT (20-50 dmg/stack, 5 stacks, slows movement)' },
  [elementPairKey('Earth', 'Negative')]: { name: 'Legendary Dust', description: '50% chance: -7 PRR / -20 Pos Healing Amp per stack (5x, 11s)' },
  [elementPairKey('Earth', 'Positive')]: { name: 'Legendary Mineral', description: 'Bypasses Adamantine/Byeshk/Cold Iron/Mithril/Silver DR, +150 durability' },
  [elementPairKey('Earth', 'Water')]: { name: 'Legendary Ooze', description: '-10 PRR/MRR (12s), ~5% chance to summon CR 32 Ooze' },
  [elementPairKey('Fire', 'Negative')]: { name: 'Legendary Ash', description: '50% chance: -7 MRR / -20 USP per stack (3x, 12s)' },
  [elementPairKey('Fire', 'Positive')]: { name: 'Legendary Radiance', description: '10-20% chance to blind with ~100 Light damage (11s, no save)' },
  [elementPairKey('Fire', 'Water')]: { name: 'Legendary Balance of Land & Sky', description: 'Moderate chance for extra acid/electric damage' },
  [elementPairKey('Negative', 'Positive')]: { name: 'Legendary Concordant Opposition', description: '1-2% chance: 50-60 HP/SP when hit; spells: temp 100 SP (1 min CD)' },
  [elementPairKey('Negative', 'Water')]: { name: 'Legendary Salt', description: '100% chance: ~-90% movement/attack speed (8 stacks, 11s)' },
  [elementPairKey('Positive', 'Water')]: { name: 'Legendary Steam', description: '15% chance to deal 70-120 untyped damage' },
}

/**
 * Get the weapon bonus effect for an LGS weapon when all 3 tiers are filled.
 * Only applies to weapons. Returns null if fewer than 3 tiers or 3+ distinct elements.
 */
export function getLgsWeaponBonusEffect(
  tierSelections: GreenSteelTierSelection[],
): WeaponBonusEffect | null {
  const elements = tierSelections
    .filter((ts) => ts.effectName)
    .map((ts) => getEffectByName(ts.effectName!)?.element)
    .filter(Boolean) as GreenSteelElement[]

  if (elements.length !== 3) return null

  const uniqueElements = [...new Set(elements)]

  if (uniqueElements.length === 1) {
    return LGS_PURE_WEAPON_BONUS[uniqueElements[0]] ?? null
  }

  if (uniqueElements.length === 2) {
    const key = elementPairKey(uniqueElements[0], uniqueElements[1])
    return LGS_DUAL_WEAPON_BONUS[key] ?? null
  }

  return null
}
