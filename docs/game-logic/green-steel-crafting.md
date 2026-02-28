# Green Steel (Heroic) Crafting

## Overview

Green Steel (GS) items are crafted at The Shroud raid altars using Focuses, Essences, Gems, and Energy Cells. Each item has 3 tiers. Unlike LGS, all GS crafting ingredients drop directly from the Shroud raid as manufactured items (no raw ingredient crafting step).

## Altars and Tiers

| Tier | Altar                | Focus Prefix | Essences  | Gems     | Energy Cell                  |
| ---- | -------------------- | ------------ | --------- | -------- | ---------------------------- |
| 1    | Altar of Invasion    | Inferior     | Diluted   | Cloudy   | Shavarath Low Energy Cell    |
| 2    | Altar of Subjugation | (none)       | Distilled | Pristine | Shavarath Medium Energy Cell |
| 3    | Altar of Devastation | Superior     | Pure      | Flawless | Shavarath High Energy Cell   |

Each tier requires: **1× Focus + 3× Essence + 3× Gem + 1× Energy Cell**

Note: Focuses are required at the altar but NOT currently tracked in the ingredient summary (only Essences, Gems, and Cells are summed).

## Focus Names

Format: `{prefix} Focus of {element_name}`

| Element  | Tier 1 Focus                      | Tier 2 Focus             | Tier 3 Focus                      |
| -------- | --------------------------------- | ------------------------ | --------------------------------- |
| Air      | Inferior Focus of Air             | Focus of Air             | Superior Focus of Air             |
| Earth    | Inferior Focus of Earth           | Focus of Earth           | Superior Focus of Earth           |
| Fire     | Inferior Focus of Fire            | Focus of Fire            | Superior Focus of Fire            |
| Water    | Inferior Focus of Water           | Focus of Water           | Superior Focus of Water           |
| Positive | Inferior Focus of Positive Energy | Focus of Positive Energy | Superior Focus of Positive Energy |
| Negative | Inferior Focus of Negative Energy | Focus of Negative Energy | Superior Focus of Negative Energy |

## Essence Types

- **Ethereal Essence** – for elemental spell power, lore, resistance, and weapon burst effects
- **Material Essence** – for stat bonuses and alignment weapon effects

## Gem Types

- **Gem of Opposition** – resistance or weapon burst effects
- **Gem of Dominion** – spell power or stat effects
- **Gem of Escalation** – lore (spell critical chance) or stat effects

## Elements

Water, Fire, Earth, Air, Positive, Negative

## Effects

### Spell Power (Ethereal + Dominion)

| Element  | Effect     | Bonus                                    |
| -------- | ---------- | ---------------------------------------- |
| Water    | Glaciation | Cold Spell Power +72/+90/+108            |
| Fire     | Combustion | Fire Spell Power +72/+90/+108            |
| Earth    | Corrosion  | Acid Spell Power +72/+90/+108            |
| Air      | Magnetism  | Electric Spell Power +72/+90/+108        |
| Positive | Radiance   | Light Spell Power +72/+90/+108           |
| Positive | Devotion   | Positive/Repair Spell Power +72/+90/+108 |
| Negative | Nihil      | Negative Energy Spell Power +72/+90/+108 |

### Lore (Ethereal + Escalation)

| Element  | Effect        |
| -------- | ------------- |
| Water    | Cold Lore     |
| Fire     | Fire Lore     |
| Earth    | Acid Lore     |
| Air      | Electric Lore |
| Positive | Light Lore    |
| Negative | Negative Lore |

### Resistance/Protection (Ethereal + Opposition)

| Element  | Effect                  |
| -------- | ----------------------- |
| Water    | Cold Resistance +28     |
| Fire     | Fire Resistance +28     |
| Earth    | Acid Resistance +28     |
| Air      | Electric Resistance +28 |
| Negative | Deathblock              |

### Stats (Material + Dominion)

| Element  | Effect                                |
| -------- | ------------------------------------- |
| Water    | False Life +30/+40/+50 HP             |
| Fire     | Strength +3/+4/+5                     |
| Earth    | Constitution +3/+4/+5                 |
| Air      | Dexterity +3/+4/+5                    |
| Positive | Devotion (Healing/Repair Spell Power) |
| Negative | Charisma +3/+4/+5                     |

### Stats (Material + Escalation)

| Element  | Effect                |
| -------- | --------------------- |
| Positive | Wisdom +3/+4/+5       |
| Air      | Intelligence +3/+4/+5 |

### Misc (Material + Opposition)

| Element | Effect          |
| ------- | --------------- |
| Air     | Feather Falling |

### Weapon Effects (Ethereal + Opposition) – GS Only

| Element  | Effect                                                                   |
| -------- | ------------------------------------------------------------------------ |
| Water    | Icy Burst                                                                |
| Fire     | Flaming Burst                                                            |
| Earth    | Corrosive                                                                |
| Air      | Shocking Burst                                                           |
| Positive | Disruption (destroys undead on crit) – **GS only, not available in LGS** |

### Weapon Effects (Material + Opposition)

| Element  | Effect    |
| -------- | --------- |
| Earth    | Smiting   |
| Positive | Banishing |
| Negative | Vorpal    |

## Related Files

- `src/domains/crafting/greenSteelLogic.ts` – Core logic (`gsOnly` flag marks GS-only effects)
- `src/pages/GreenSteelCrafting.tsx` – UI page (filters out `lgsOnly` effects)
- DDO Wiki: https://ddowiki.com/page/Green_Steel_item_crafting_steps

## Key Differences from LGS

| Aspect            | GS (Heroic)                                  | LGS (Legendary)                             |
| ----------------- | -------------------------------------------- | ------------------------------------------- |
| Ingredient source | Drops directly as manufactured items         | 6 raw ingredients crafted into manufactured |
| Tier 2 prefixes   | Distilled / Pristine                         | (none) / (none)                             |
| Focus crafting    | Drops as-is (no raw ingredient step)         | Requires 4 raw ingredients + CoV            |
| Disruption effect | Available (Positive + Ethereal + Opposition) | Not available (replaced by Righteousness)   |

## Changelog

- 2025-07: Added Focus names and per-tier crafting requirements; added GS vs LGS comparison table
- 2025: Added `gsOnly` flag to Disruption; added `lgsOnly` flag for LGS-specific effects
