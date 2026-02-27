// ============================================================================
// Legendary Green Steel (LGS) Crafting Logic
// ============================================================================
// Based on: https://ddowiki.com/page/Legendary_Green_Steel_items
// ============================================================================

import type { GreenSteelElement, GreenSteelIngredientSummary, GreenSteelTierSelection } from './greenSteelLogic'
import { getEffectByName, INGREDIENTS_PER_TIER } from './greenSteelLogic'

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
