# Legendary Green Steel (LGS) Crafting

## Overview

Legendary Green Steel (LGS) items are crafted at the Legendary Shroud raid altars. The crafting uses the same essence/gem/energy cell structure as Heroic GS but with element-specific Legendary ingredients.

## Altars and Tiers

| Tier | Altar                             | Size   | Energy Cell                  |
| ---- | --------------------------------- | ------ | ---------------------------- |
| 1    | Legendary Altar of Invasion       | Small  | Legendary Low Energy Cell    |
| 2    | Legendary Altar of Subjugation    | Medium | Legendary Medium Energy Cell |
| 3    | Legendary Altar of Devastation    | Large  | Legendary High Energy Cell   |

Each tier requires: 3× Ingredient + 1× Energy Cell (uses element-specific ingredients instead of typed essences+gems)

## Key Difference from GS: Ingredient Calculation

In LGS, the ingredient is determined by the ELEMENT only:

| Element  | Ingredient         |
| -------- | ------------------ |
| Water    | Twisted Shrapnel   |
| Fire     | Devil Scales       |
| Earth    | Sulfurous Stone    |
| Air      | Arrowhead          |
| Positive | Bones              |
| Negative | Stone of Change    |

Ingredient name format: `Legendary {Small/Medium/Large} {ingredient_name}`

- Tier 1 = Small, Tier 2 = Medium, Tier 3 = Large

## Effects

### Shared with GS

All GS effects except `Disruption` are also available in LGS.

### LGS-Specific Weapon Effects (Ethereal + Opposition)

| Effect        | Element  | Description                                              |
| ------------- | -------- | -------------------------------------------------------- |
| Righteousness | Positive | Good damage on hit (12d6 good), makes weapon Good-aligned |
| Enervating    | Negative | Evil/Negative damage on hit (12d6 evil), makes weapon Evil-aligned |

Note: LGS uses `Righteousness` where GS uses `Disruption` for the Positive + Ethereal + Opposition slot.

## Related Files

- `src/domains/crafting/lgsLogic.ts` – Core logic
- `src/domains/crafting/greenSteelLogic.ts` – Shared effects (`lgsOnly` flag marks LGS-specific effects)
- `src/pages/LegendaryGreenSteelCrafting.tsx` – UI page (filters out `gsOnly` effects)
- DDO Wiki: https://ddowiki.com/page/Legendary_Green_Steel_items

## Changelog

- 2025: Added Righteousness and Enervating as `lgsOnly` effects; LGS page filters out `gsOnly` Disruption
