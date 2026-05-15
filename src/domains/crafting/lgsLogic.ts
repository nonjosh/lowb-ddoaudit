// ============================================================================
// Legendary Green Steel (LGS) Crafting Logic
// ============================================================================
// Based on: https://ddowiki.com/page/Legendary_Green_Steel_items
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_1
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_2
//           https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_3
// ============================================================================

import type {
  EssenceType,
  GemType,
  GreenSteelElement,
  GreenSteelIngredientSummary,
  GreenSteelItemType,
  GreenSteelTier,
  WeaponBonusEffect,
} from './greenSteelLogic'
import type { LgsTierSelection } from './lgsData'
import { getFocusName } from './greenSteelLogic'
import { getLgsOptionById } from './lgsData'

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
// LGS Size and CoV Constants
// ============================================================================

export const LGS_SIZE_PREFIX: Record<1 | 2 | 3, string> = {
  1: 'Small',
  2: 'Medium',
  3: 'Large',
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

export interface LgsPlannedItemLike {
  itemType: GreenSteelItemType
  tierSelections: LgsTierSelection[]
}

// ============================================================================
// Ingredient Name Helpers
// ============================================================================

/** Get the full name of a raw ingredient with tier size prefix */
export function getLgsRawIngredientName(tier: 1 | 2 | 3, ingredient: LgsRawIngredient): string {
  return `Legendary ${LGS_SIZE_PREFIX[tier]} ${ingredient}`
}

function addIngredient(summary: GreenSteelIngredientSummary, ingredient: string, amount = 1) {
  summary[ingredient] = (summary[ingredient] ?? 0) + amount
}

export function getLgsIngredientSummaryForSelection(
  itemType: GreenSteelItemType,
  selection: LgsTierSelection,
): GreenSteelIngredientSummary {
  if (!selection.optionId) {
    return {}
  }

  const option = getLgsOptionById(selection.optionId)
  if (!option) {
    return {}
  }

  const tier = selection.tier as 1 | 2 | 3
  const summary: GreenSteelIngredientSummary = {}

  for (const ingredient of LGS_FOCUS_RECIPES[option.focus]) {
    addIngredient(summary, getLgsRawIngredientName(tier, ingredient))
  }

  addIngredient(summary, 'Commendation of Valor', LGS_COV_PER_TIER[tier])

  for (const ingredient of LGS_ESSENCE_RECIPES[option.essenceType]) {
    addIngredient(summary, getLgsRawIngredientName(tier, ingredient))
  }

  for (const ingredient of LGS_GEM_RECIPES[option.gemType]) {
    addIngredient(summary, getLgsRawIngredientName(tier, ingredient))
  }

  if (itemType === 'Weapon' && tier === 3) {
    const secondaryFocus = selection.secondaryFocus ?? option.focus
    for (const ingredient of LGS_FOCUS_RECIPES[secondaryFocus]) {
      addIngredient(summary, getLgsRawIngredientName(tier, ingredient))
    }

    addIngredient(summary, 'Commendation of Valor', LGS_COV_PER_TIER[tier])
  }

  return summary
}

// ============================================================================
// Ingredient Calculation
// ============================================================================

/**
 * Calculate total LGS raw ingredient requirements for a set of tier selections.
 *
 * Each tier slot requires crafting manufactured ingredients (Focus + Essence + Gem).
 * Each manufactured ingredient requires 4 of the 6 raw ingredients (1 each). Focuses
 * also require Commendation of Valor, which replaces heroic GS charged cells.
 */
export function calculateLgsIngredients(
  items: LgsPlannedItemLike[],
): GreenSteelIngredientSummary {
  const summary: GreenSteelIngredientSummary = {}

  for (const item of items) {
    for (const selection of item.tierSelections) {
      const selectionSummary = getLgsIngredientSummaryForSelection(item.itemType, selection)
      for (const [ingredient, required] of Object.entries(selectionSummary)) {
        addIngredient(summary, ingredient, required)
      }
    }
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
  tier: GreenSteelTier
  effectName: string
  focus: string
  secondaryFocus: string | null
  essence: string
  gem: string
  requiresSecondaryFocus: boolean
}

/**
 * Get the LGS manufactured ingredient names for the crafting steps display.
 * Uses LGS-specific tier prefixes (Tier 2 has no prefix, unlike GS).
 */
export function getLgsCraftingSteps(
  itemType: GreenSteelItemType,
  selections: LgsTierSelection[],
): LgsCraftingStep[] {
  return selections.flatMap((selection) => {
    if (!selection.optionId) {
      return []
    }

    const option = getLgsOptionById(selection.optionId)
    if (!option) {
      return []
    }

    const tier = selection.tier as 1 | 2 | 3
    const essencePrefix = LGS_TIER_ESSENCE_PREFIX[tier]
    const gemPrefix = LGS_TIER_GEM_PREFIX[tier]
    const secondaryFocus =
      itemType === 'Weapon' && tier === 3
        ? getLgsFocusName(tier, selection.secondaryFocus ?? option.focus)
        : null

    return [
      {
        tier,
        effectName: option.effectName,
        focus: getLgsFocusName(tier, option.focus),
        secondaryFocus,
        essence: essencePrefix
          ? `Legendary ${essencePrefix} ${option.essenceType} Essence`
          : `Legendary ${option.essenceType} Essence`,
        gem: gemPrefix
          ? `Legendary ${gemPrefix} Gem of ${option.gemType}`
          : `Legendary Gem of ${option.gemType}`,
        requiresSecondaryFocus: itemType === 'Weapon' && tier === 3,
      },
    ]
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
 * Legendary weapon bonuses are determined by four focuses: T1, T2, and two T3 foci.
 */
export function getLgsWeaponBonusEffect(
  tierSelections: LgsTierSelection[],
): WeaponBonusEffect | null {
  const selectionByTier = new Map(
    tierSelections
      .filter((selection) => selection.optionId)
      .map((selection) => [selection.tier, selection]),
  )

  const tierOneSelection = selectionByTier.get(1)
  const tierTwoSelection = selectionByTier.get(2)
  const tierThreeSelection = selectionByTier.get(3)

  if (!tierOneSelection?.optionId || !tierTwoSelection?.optionId || !tierThreeSelection?.optionId) {
    return null
  }

  const tierOneOption = getLgsOptionById(tierOneSelection.optionId)
  const tierTwoOption = getLgsOptionById(tierTwoSelection.optionId)
  const tierThreeOption = getLgsOptionById(tierThreeSelection.optionId)

  if (!tierOneOption || !tierTwoOption || !tierThreeOption) {
    return null
  }

  const secondaryFocus = tierThreeSelection.secondaryFocus
  if (!secondaryFocus) {
    return null
  }

  const focusCounts = new Map<GreenSteelElement, number>()
  for (const focus of [
    tierOneOption.focus,
    tierTwoOption.focus,
    tierThreeOption.focus,
    secondaryFocus,
  ]) {
    focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1)
  }

  const uniqueElements = [...focusCounts.keys()]

  if (uniqueElements.length === 1 && focusCounts.get(uniqueElements[0]) === 4) {
    return LGS_PURE_WEAPON_BONUS[uniqueElements[0]] ?? null
  }

  if (uniqueElements.length === 2 && uniqueElements.every((element) => focusCounts.get(element) === 2)) {
    const key = elementPairKey(uniqueElements[0], uniqueElements[1])
    return LGS_DUAL_WEAPON_BONUS[key] ?? null
  }

  return null
}
