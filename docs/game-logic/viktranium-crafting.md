# Viktranium Experiment Crafting

## Overview

The Viktranium Experiment crafting system is from the **Chill of Ravenloft** expansion (Update 75). Players craft augments at the **Viktranium Experiment Crafting Device** in Ludendorf City Hall.

## Slot Types

Items have one or more Viktranium slots:

- **Melancholic** – Weakest slot tier
- **Dolorous** – Second tier
- **Miserable** – Third tier
- **Woeful** – Most powerful slot tier

Each slot type has Accessory, Armor, and Weapon variants (Woeful has no Armor variant).

## Ingredients

### Base Ingredients (most slots)

- Bleak Alternator
- Bleak Conductor
- Bleak Insulator
- Bleak Resistor

### Additional Ingredients

- **Bleak Wire** – Used in Melancholic (Armor), Miserable (Accessory/Weapon)
- **Bleak Transformer** – Used in Woeful (all types) – rare raid drop
- **Bleak Memento** – Used for Wicked variants of Miserable and Woeful augments

### Legendary Versions

All ingredients have Legendary counterparts prefixed with "Legendary ".

## Ingredient Costs Per Augment

| Slot Type                      | Heroic Cost                      | Legendary Cost                                          |
| ------------------------------ | -------------------------------- | ------------------------------------------------------- |
| Melancholic (Accessory/Weapon) | 5× each × 4 ingredients          | 25× each × 4 ingredients                                |
| Melancholic (Armor)            | 5× each × 4 + Wire×20            | 25× each × 4 + Wire×100                                 |
| Dolorous (all)                 | 10× each × 4 ingredients         | 50× each × 4 ingredients                                |
| Miserable (Accessory/Weapon)   | 5× each × 4 + Wire×20            | 25× each × 4 + Wire×100 (Wicked: +2x Mementos)          |
| Woeful (all)                   | 10× each × 5 (incl. Transformer) | 50× each × 5 (incl. Transformer) (Wicked: +5x Mementos) |

## ML Threshold

- Heroic augments: ML ≤ 20
- Legendary augments: ML > 20
- Wicked augments: ML > 20 (Uses Bleak Mementos in addition to Legendary ingredients)

## Related Files

- `src/domains/crafting/viktraniumLogic.ts` – Core logic and `SLOT_INGREDIENT_CONFIGS`
- `src/pages/ViktraniumCrafting.tsx` – UI page

## Changelog

- 2025: Initial implementation with per-slot-type ingredient configuration and Bleak Wire support
