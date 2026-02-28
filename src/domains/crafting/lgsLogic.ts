// ============================================================================
// Legendary Green Steel (LGS) Crafting Logic
// ============================================================================
// Based on: https://ddowiki.com/page/Legendary_Green_Steel_items
// ============================================================================

import type { GreenSteelElement, GreenSteelIngredientSummary, GreenSteelTierSelection, WeaponBonusEffect } from './greenSteelLogic'
import { getEffectByName, getFocusName, INGREDIENTS_PER_TIER, TIER_ESSENCE_PREFIX, TIER_GEM_PREFIX } from './greenSteelLogic'

// ============================================================================
// LGS Ingredient Mapping
// ============================================================================

export const LGS_INGREDIENT_BY_ELEMENT: Record<GreenSteelElement, string> = {
  Water: 'Twisted Shrapnel',
  Fire: 'Devil Scales',
  Earth: 'Sulfurous Stone',
  Air: 'Arrowhead',
  Positive: 'Bones',
  Negative: 'Stone of Change',
}

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

export function getLgsIngredientName(tier: 1 | 2 | 3, element: GreenSteelElement): string {
  return `Legendary ${LGS_SIZE_PREFIX[tier]} ${LGS_INGREDIENT_BY_ELEMENT[element]}`
}

// ============================================================================
// Ingredient Calculation
// ============================================================================

/**
 * Calculate total LGS ingredient requirements for a set of tier selections.
 * Each filled tier requires INGREDIENTS_PER_TIER ingredients + 1 energy cell.
 */
export function calculateLgsIngredients(
  selections: GreenSteelTierSelection[],
): GreenSteelIngredientSummary {
  const summary: GreenSteelIngredientSummary = {}

  for (const sel of selections) {
    if (!sel.effectName) continue
    const effect = getEffectByName(sel.effectName)
    if (!effect) continue

    const ingredientName = getLgsIngredientName(sel.tier, effect.element)
    summary[ingredientName] = (summary[ingredientName] ?? 0) + INGREDIENTS_PER_TIER

    const cell = LGS_ENERGY_CELL[sel.tier]
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
  ingredient: string
  ingredientQty: number
  cell: string
}

export function getLgsCraftingSteps(selections: GreenSteelTierSelection[]): LgsCraftingStep[] {
  return selections
    .filter((sel) => sel.effectName)
    .map((sel) => {
      const effect = getEffectByName(sel.effectName!)!
      const tier = sel.tier as 1 | 2 | 3
      const essencePrefix = TIER_ESSENCE_PREFIX[tier]
      const gemPrefix = TIER_GEM_PREFIX[tier]
      return {
        tier,
        focus: getLgsFocusName(tier, effect.element),
        essence: `Legendary ${essencePrefix} ${effect.essenceType} Essence`,
        gem: `Legendary ${gemPrefix} Gem of ${effect.gemType}`,
        ingredient: getLgsIngredientName(tier, effect.element),
        ingredientQty: INGREDIENTS_PER_TIER,
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
