# Green Steel (Heroic) Crafting

## Overview

Green Steel (GS) items are crafted at The Shroud raid altars using essences, gems, and energy cells. Each item has 3 tiers.

## Altars and Tiers

| Tier | Altar                    | Essences   | Gems     | Energy Cell                  |
| ---- | ------------------------ | ---------- | -------- | ---------------------------- |
| 1    | Altar of Invasion        | Diluted    | Cloudy   | Shavarath Low Energy Cell    |
| 2    | Altar of Subjugation     | Distilled  | Pristine | Shavarath Medium Energy Cell |
| 3    | Altar of Devastation     | Pure       | Flawless | Shavarath High Energy Cell   |

Each tier requires: 3× Essence + 3× Gem + 1× Energy Cell

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

| Element  | Effect     | Bonus                            |
| -------- | ---------- | -------------------------------- |
| Water    | Glaciation | Cold Spell Power +72/+90/+108    |
| Fire     | Combustion | Fire Spell Power +72/+90/+108    |
| Earth    | Corrosion  | Acid Spell Power +72/+90/+108    |
| Air      | Magnetism  | Electric Spell Power +72/+90/+108 |
| Positive | Radiance   | Light Spell Power +72/+90/+108   |
| Positive | Devotion   | Positive/Repair Spell Power +72/+90/+108 |
| Negative | Nihil      | Negative Energy Spell Power +72/+90/+108 |

### Lore (Ethereal + Escalation)

| Element  | Effect         |
| -------- | -------------- |
| Water    | Cold Lore      |
| Fire     | Fire Lore      |
| Earth    | Acid Lore      |
| Air      | Electric Lore  |
| Positive | Light Lore     |
| Negative | Negative Lore  |

### Resistance/Protection (Ethereal + Opposition)

| Element  | Effect            |
| -------- | ----------------- |
| Water    | Cold Resistance +28 |
| Fire     | Fire Resistance +28 |
| Earth    | Acid Resistance +28 |
| Air      | Electric Resistance +28 |
| Negative | Deathblock        |

### Stats (Material + Dominion)

| Element  | Effect         |
| -------- | -------------- |
| Water    | False Life +30/+40/+50 HP |
| Fire     | Strength +3/+4/+5 |
| Earth    | Constitution +3/+4/+5 |
| Air      | Dexterity +3/+4/+5 |
| Positive | Devotion (Healing/Repair Spell Power) |
| Negative | Charisma +3/+4/+5 |

### Stats (Material + Escalation)

| Element  | Effect              |
| -------- | ------------------- |
| Positive | Wisdom +3/+4/+5     |
| Air      | Intelligence +3/+4/+5 |

### Misc (Material + Opposition)

| Element | Effect          |
| ------- | --------------- |
| Air     | Feather Falling |

### Weapon Effects (Ethereal + Opposition) – GS Only

| Element  | Effect         |
| -------- | -------------- |
| Water    | Icy Burst      |
| Fire     | Flaming Burst  |
| Earth    | Corrosive      |
| Air      | Shocking Burst |
| Positive | Disruption (destroys undead on crit) – **GS only, not available in LGS** |

### Weapon Effects (Material + Opposition)

| Element  | Effect   |
| -------- | -------- |
| Earth    | Smiting  |
| Positive | Banishing |
| Negative | Vorpal   |

## Related Files

- `src/domains/crafting/greenSteelLogic.ts` – Core logic (`gsOnly` flag marks GS-only effects)
- `src/pages/GreenSteelCrafting.tsx` – UI page (filters out `lgsOnly` effects)
- DDO Wiki: https://ddowiki.com/page/Green_Steel_item_crafting_steps

## Changelog

- 2025: Added `gsOnly` flag to Disruption; added `lgsOnly` flag for LGS-specific effects
