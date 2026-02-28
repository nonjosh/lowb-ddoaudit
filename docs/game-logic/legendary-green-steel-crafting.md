# Legendary Green Steel (LGS) Crafting

## Overview

Legendary Green Steel (LGS) items are crafted at the Legendary Shroud raid altars. Unlike Heroic GS (which uses typed essences/gems as direct drops), LGS uses 6 raw ingredient types that are combined into manufactured Focus, Essence, and Gem components. Each tier upgrade requires crafting all three manufactured ingredients plus consuming an Energy Cell.

## Altars and Tiers

| Tier | Altar                          | Raw Size | Energy Cell                  |
| ---- | ------------------------------ | -------- | ---------------------------- |
| 1    | Legendary Altar of Invasion    | Small    | Legendary Low Energy Cell    |
| 2    | Legendary Altar of Subjugation | Medium   | Legendary Medium Energy Cell |
| 3    | Legendary Altar of Devastation | Large    | Legendary High Energy Cell   |

## Raw Ingredients

Six raw ingredient types drop from Legendary Shroud. Their full name includes a size prefix based on the tier: `Legendary {Small/Medium/Large} {base_name}`

| Base Name                | Abbreviation |
| ------------------------ | ------------ |
| Glowing Arrowhead        | Arrowhead    |
| Gnawed Bone              | Bone         |
| Twisted Shrapnel         | Shrapnel     |
| Length of Infernal Chain | Chain        |
| Sulfurous Stone          | Stone        |
| Devil Scales             | Scales       |

## Raw Ingredient Recipes

Each manufactured ingredient requires **4 of the 6** raw ingredients (1 each), plus Commendation of Valor (CoV) for Focuses. The same recipe pattern applies across all tiers; only the size prefix changes.

### Focus Recipes

| Focus Element   | Arrowhead | Bone | Shrapnel | Chain | Stone | Scales | CoV (T1/T2/T3) |
| --------------- | :-------: | :--: | :------: | :---: | :---: | :----: | :------------: |
| Air             |     ✔     |  ✔   |    ✔     |       |   ✔   |        | 25 / 50 / 100  |
| Earth           |     ✔     |  ✔   |    ✔     |   ✔   |       |        | 25 / 50 / 100  |
| Fire            |     ✔     |  ✔   |    ✔     |       |       |   ✔    | 25 / 50 / 100  |
| Water           |     ✔     |  ✔   |          |   ✔   |       |   ✔    | 25 / 50 / 100  |
| Negative Energy |     ✔     |      |    ✔     |   ✔   |   ✔   |        | 25 / 50 / 100  |
| Positive Energy |     ✔     |  ✔   |          |       |   ✔   |   ✔    | 25 / 50 / 100  |

### Essence Recipes

| Essence Type | Arrowhead | Bone | Shrapnel | Chain | Stone | Scales |
| ------------ | :-------: | :--: | :------: | :---: | :---: | :----: |
| Ethereal     |     ✔     |      |          |   ✔   |   ✔   |   ✔    |
| Material     |     ✔     |      |    ✔     |       |   ✔   |   ✔    |

### Gem Recipes

| Gem Type   | Arrowhead | Bone | Shrapnel | Chain | Stone | Scales |
| ---------- | :-------: | :--: | :------: | :---: | :---: | :----: |
| Dominion   |           |  ✔   |    ✔     |   ✔   |       |   ✔    |
| Escalation |           |      |    ✔     |   ✔   |   ✔   |   ✔    |
| Opposition |           |  ✔   |          |   ✔   |   ✔   |   ✔    |

## Manufactured Ingredient Naming by Tier

LGS Tier 2 differs from GS in that it uses **no tier prefix** for manufactured ingredients:

| Tier | Focus Name                             | Essence Name                         | Gem Name                             |
| ---- | -------------------------------------- | ------------------------------------ | ------------------------------------ |
| 1    | Legendary **Inferior** Focus of {Elem} | Legendary **Diluted** {Type} Essence | Legendary **Cloudy** Gem of {Type}   |
| 2    | Legendary Focus of {Elem}              | Legendary {Type} Essence             | Legendary Gem of {Type}              |
| 3    | Legendary **Superior** Focus of {Elem} | Legendary **Pure** {Type} Essence    | Legendary **Flawless** Gem of {Type} |

**Important**: GS Tier 2 uses "Distilled" and "Pristine" prefixes, but LGS Tier 2 has no prefix at all.

## Per-Tier Cost Summary

Each tier slot requires the following to craft:

- **1 Focus** = 4 raw ingredients + CoV
- **1 Essence** = 4 raw ingredients
- **1 Gem** = 4 raw ingredients
- **1 Energy Cell**

Total per tier: **12 raw ingredients** + CoV + 1 Energy Cell

## Effects

### Shared with GS

All GS effects except `Disruption` are also available in LGS.

### LGS-Specific Weapon Effects (Ethereal + Opposition)

| Effect        | Element  | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| Righteousness | Positive | Good damage on hit (12d6 good), makes weapon Good-aligned          |
| Enervating    | Negative | Evil/Negative damage on hit (12d6 evil), makes weapon Evil-aligned |

Note: LGS uses `Righteousness` where GS uses `Disruption` for the Positive + Ethereal + Opposition slot.

## Key Constants

| Constant              | Value                   | Location                           |
| --------------------- | ----------------------- | ---------------------------------- |
| `LGS_RAW_INGREDIENTS` | 6 base ingredient names | `src/domains/crafting/lgsLogic.ts` |
| `LGS_COV_PER_TIER`    | 25 / 50 / 100           | `src/domains/crafting/lgsLogic.ts` |
| `LGS_SIZE_PREFIX`     | Small / Medium / Large  | `src/domains/crafting/lgsLogic.ts` |
| `LGS_ENERGY_CELL`     | Low / Medium / High     | `src/domains/crafting/lgsLogic.ts` |

## Related Files

- `src/domains/crafting/lgsLogic.ts` – Core logic, raw ingredient recipes, ingredient calculation
- `src/domains/crafting/greenSteelLogic.ts` – Shared effects (`lgsOnly` flag marks LGS-specific effects)
- `src/pages/LegendaryGreenSteelCrafting.tsx` – UI page (filters out `gsOnly` effects)
- DDO Wiki: https://ddowiki.com/page/Legendary_Green_Steel_items

## Changelog

- 2025-07: Fixed raw ingredient names (Glowing Arrowhead, Gnawed Bone, etc.), added complete recipe tables for Focus/Essence/Gem, fixed Tier 2 manufactured ingredient naming (no prefix), added CoV tracking per tier
- 2025: Added Righteousness and Enervating as `lgsOnly` effects; LGS page filters out `gsOnly` Disruption
