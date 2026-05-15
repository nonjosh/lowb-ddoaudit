---
name: ddo-legendary-green-steel
description: "DDO Legendary Green Steel (LGS) crafting at Legendary Shroud altars, raw ingredient recipes, manufactured ingredient naming, CoV requirements, and LGS-specific effects. Use when modifying LGS crafting logic, raw ingredient tracking, focus/essence/gem recipes, or the LGS crafting page."
---

# DDO Legendary Green Steel (LGS) Crafting

## Canonical Wiki Sources

- Main page: `https://ddowiki.com/page/Legendary_Green_Steel_items`
- Tier 1 recipes: `https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_1`
- Tier 2 recipes: `https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_2`
- Tier 3 recipes: `https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_3`
- Tier 3 weapon bonus table: `https://ddowiki.com/page/Legendary_Green_Steel_items/Tier_3#Weapon_bonus_effects`
- Active augments: `https://ddowiki.com/page/Legendary_Green_Steel_items/Active`

## When to Use

- Modifying LGS crafting logic or ingredient calculation
- Adding/changing LGS-specific augment options
- Working with raw ingredient recipes
- Working with LGS blank item lists
- Working with Tier 3 weapon bonus logic or double-shard recipes
- Working with the LGS crafting page UI

## Slots and Tiers

Legendary Green Steel uses augment slots rather than the heroic GS upgrade path.

- Weapons have 4 slots: Tier 1, Tier 2, Tier 3, Active
- Accessories have 5 slots: Tier 1, Tier 2, Tier 3, Active, Fangs of Shavarath
- The current planner page models the core Tier 1-3 augments and Tier 3 weapon bonuses; Active and Fangs are documented by the wiki but not yet planned in the UI

## Altars and Tiers

| Tier | Altar                          | Raw Size |
| ---- | ------------------------------ | -------- |
| 1    | Legendary Altar of Invasion    | Small    |
| 2    | Legendary Altar of Subjugation | Medium   |
| 3    | Legendary Altar of Devastation | Large    |

## Blank Items

- LGS blank items differ from heroic GS blanks
- Accessories are: Weave Boots, Weave Gloves, Belt, Weave Cloak, Helm, Necklace, Bracers, Goggles
- LGS has extra weapon blanks such as Sceptre, Dwarven Waraxe, throwing weapons, bows, and crossbows
- Accessory subtype does **not** change the available Tier 1-3 augment pools; subtype only selects the blank item

## Raw Ingredients (6 types)

Glowing Arrowhead, Gnawed Bone, Twisted Shrapnel, Length of Infernal Chain, Sulfurous Stone, Devil Scales

Full names: `Legendary {Small/Medium/Large} {base_name}`

## Per-Tier Cost

- Standard Tier 1-3 augment: 1 Focus + 1 Essence + 1 Gem
- Focus cost: 4 raw ingredients + CoV (25 / 50 / 100 by tier)
- Essence cost: 4 raw ingredients
- Gem cost: 4 raw ingredients
- Standard total: 12 raw ingredients + CoV per selected tier
- LGS does **not** use Low/Medium/High Energy Cells; the main wiki page states CoV is used for raw-to-manufactured generation in place of charged cells
- **Tier 3 weapons are different**: every Tier 3 weapon augment is a double-shard-equivalent recipe and needs a second Superior Focus
- Tier 3 weapon total: 2 Focuses + 1 Essence + 1 Gem = 16 raw ingredients + 2x CoV

## Raw Ingredient Recipes

See [LGS recipes reference](./references/lgs-recipes.md) for full recipe tables.

## Manufactured Ingredient Naming

| Tier | Focus                                  | Essence                              | Gem                                  |
| ---- | -------------------------------------- | ------------------------------------ | ------------------------------------ |
| 1    | Legendary **Inferior** Focus of {Elem} | Legendary **Diluted** {Type} Essence | Legendary **Cloudy** Gem of {Type}   |
| 2    | Legendary Focus of {Elem}              | Legendary {Type} Essence             | Legendary Gem of {Type}              |
| 3    | Legendary **Superior** Focus of {Elem} | Legendary **Pure** {Type} Essence    | Legendary **Flawless** Gem of {Type} |

**Important**: GS Tier 2 uses "Distilled"/"Pristine" but LGS Tier 2 has **no prefix**.

## Tier Option Model

Each tier exposes 6 focus elements crossed with 6 augment families:

- `Ethereal + Dominion`
- `Material + Dominion`
- `Ethereal + Escalation`
- `Material + Escalation`
- `Ethereal + Opposition`
- `Material + Opposition`

Those families resolve to different outputs for weapons vs accessories:

- Accessories use equipment augments such as spell crit damage, reactive damage, skills + SP/HP, saves, and resistance/utility augments
- Weapons use weapon augments such as spell power, on-hit damage, stat bonuses, MRR, and absorption/utility augments
- The LGS planner should use an LGS-specific option catalog, not the heroic/shared `GREEN_STEEL_EFFECTS` list

## LGS-Specific Weapon Effects (Ethereal + Opposition)

| Effect        | Element  | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| Righteousness | Positive | Good damage (12d6), Good-aligned weapon     |
| Enervating    | Negative | Evil/Neg damage (12d6), Evil-aligned weapon |

All other GS effects except Disruption are shared.

## Tier 3 Weapon Bonus Rules

- The final LGS weapon bonus is determined by **four** focuses: Tier 1, Tier 2, and the two Tier 3 focuses
- Legendary Aspect Dominance is discontinued; the secondary Tier 3 focus is chosen freely
- Pure bonuses require all 4 focuses to match
- Dual bonuses require exactly 2 unique elements with 2 focuses each
- 3-focus or 4-focus mixes do not grant a documented named weapon bonus

## Equipment Set Bonuses

- Equipment set bonuses live on the main wiki page, not the Tier recipe subpages
- Dominion / Escalation / Opposition set bonuses depend on plurality across cleansed accessories
- Ethereal / Material set bonuses require 4 matching augments
- 5-piece combination bonuses require both the 2-piece and 4-piece conditions
- These cross-item set bonuses are separate from the per-slot recipe tables

## Key Constants

| Constant              | Value              | Location                           |
| --------------------- | ------------------ | ---------------------------------- |
| `LGS_RAW_INGREDIENTS` | 6 names            | `src/domains/crafting/lgsLogic.ts` |
| `LGS_COV_PER_TIER`    | 25/50/100          | `src/domains/crafting/lgsLogic.ts` |
| `LGS_SIZE_PREFIX`     | Small/Medium/Large | `src/domains/crafting/lgsLogic.ts` |

## Related Files

| File                                        | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `src/domains/crafting/lgsData.ts`           | LGS blank lists and option catalog   |
| `src/domains/crafting/lgsLogic.ts`          | Core logic, recipes, ingredient calc |
| `src/domains/crafting/greenSteelLogic.ts`   | Shared effects (`lgsOnly` flag)      |
| `src/pages/LegendaryGreenSteelCrafting.tsx` | UI page                              |
