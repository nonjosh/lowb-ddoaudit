---
name: ddo-legendary-green-steel
description: "DDO Legendary Green Steel (LGS) crafting at Legendary Shroud altars, raw ingredient recipes, manufactured ingredient naming, CoV requirements, and LGS-specific effects. Use when modifying LGS crafting logic, raw ingredient tracking, focus/essence/gem recipes, or the LGS crafting page."
---

# DDO Legendary Green Steel (LGS) Crafting

## When to Use

- Modifying LGS crafting logic or ingredient calculation
- Adding/changing LGS-specific effects
- Working with raw ingredient recipes
- Working with the LGS crafting page UI

## Altars and Tiers

| Tier | Altar                          | Raw Size | Energy Cell                  |
| ---- | ------------------------------ | -------- | ---------------------------- |
| 1    | Legendary Altar of Invasion    | Small    | Legendary Low Energy Cell    |
| 2    | Legendary Altar of Subjugation | Medium   | Legendary Medium Energy Cell |
| 3    | Legendary Altar of Devastation | Large    | Legendary High Energy Cell   |

## Raw Ingredients (6 types)

Glowing Arrowhead, Gnawed Bone, Twisted Shrapnel, Length of Infernal Chain, Sulfurous Stone, Devil Scales

Full names: `Legendary {Small/Medium/Large} {base_name}`

## Per-Tier Cost

- 1 Focus = 4 raw ingredients + CoV (25/50/100 per tier)
- 1 Essence = 4 raw ingredients
- 1 Gem = 4 raw ingredients
- 1 Energy Cell
- **Total: 12 raw ingredients + CoV + 1 Energy Cell per tier**

## Raw Ingredient Recipes

See [LGS recipes reference](./references/lgs-recipes.md) for full recipe tables.

## Manufactured Ingredient Naming

| Tier | Focus                                  | Essence                              | Gem                                  |
| ---- | -------------------------------------- | ------------------------------------ | ------------------------------------ |
| 1    | Legendary **Inferior** Focus of {Elem} | Legendary **Diluted** {Type} Essence | Legendary **Cloudy** Gem of {Type}   |
| 2    | Legendary Focus of {Elem}              | Legendary {Type} Essence             | Legendary Gem of {Type}              |
| 3    | Legendary **Superior** Focus of {Elem} | Legendary **Pure** {Type} Essence    | Legendary **Flawless** Gem of {Type} |

**Important**: GS Tier 2 uses "Distilled"/"Pristine" but LGS Tier 2 has **no prefix**.

## LGS-Specific Weapon Effects (Ethereal + Opposition)

| Effect        | Element  | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| Righteousness | Positive | Good damage (12d6), Good-aligned weapon     |
| Enervating    | Negative | Evil/Neg damage (12d6), Evil-aligned weapon |

All other GS effects except Disruption are shared.

## Key Constants

| Constant              | Value              | Location                           |
| --------------------- | ------------------ | ---------------------------------- |
| `LGS_RAW_INGREDIENTS` | 6 names            | `src/domains/crafting/lgsLogic.ts` |
| `LGS_COV_PER_TIER`    | 25/50/100          | `src/domains/crafting/lgsLogic.ts` |
| `LGS_SIZE_PREFIX`     | Small/Medium/Large | `src/domains/crafting/lgsLogic.ts` |

## Related Files

| File                                        | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `src/domains/crafting/lgsLogic.ts`          | Core logic, recipes, ingredient calc |
| `src/domains/crafting/greenSteelLogic.ts`   | Shared effects (`lgsOnly` flag)      |
| `src/pages/LegendaryGreenSteelCrafting.tsx` | UI page                              |
