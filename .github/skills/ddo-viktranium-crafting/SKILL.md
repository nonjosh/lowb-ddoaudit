---
name: ddo-viktranium-crafting
description: "DDO Viktranium Experiment crafting from Chill of Ravenloft (U75), slot types (Melancholic/Dolorous/Miserable/Woeful), ingredient costs, Bleak ingredients, Wicked variants, and explicit heroic ML 8 / legendary ML 34 rules. Use when modifying Viktranium crafting logic, ingredient tracking, or the Viktranium crafting page."
---

# DDO Viktranium Experiment Crafting

Viktranium Experiment crafting is a Heroic (ML 8) and Legendary (ML 34) crafting system introduced in Update 75: The Chill of Ravenloft.

## When to Use

- Modifying Viktranium crafting logic or ingredient costs
- Adding new slot types or Wicked variants
- Working with the Viktranium crafting page UI

## Slot Types

- **Melancholic** — Weakest tier
- **Dolorous** — Second tier
- **Miserable** — Third tier
- **Woeful** — Most powerful tier

Each has Accessory, Armor, and Weapon variants (Woeful has no Armor variant).

## Base Ingredients

Bleak Alternator, Bleak Conductor, Bleak Insulator, Bleak Resistor

### Additional Ingredients

- **Bleak Wire** — Melancholic (Armor), Miserable (Accessory/Weapon)
- **Bleak Transformer** — Woeful (all types) — rare raid drop
- **Bleak Memento** — Wicked variants of Miserable and Woeful

All have Legendary counterparts prefixed with "Legendary ".

## Ingredient Costs

| Slot Type                      | Heroic Cost                      | Legendary Cost                                  |
| ------------------------------ | -------------------------------- | ----------------------------------------------- |
| Melancholic (Accessory/Weapon) | 5× each × 4                      | 25× each × 4                                    |
| Melancholic (Armor)            | 5× each × 4 + Wire×20            | 25× each × 4 + Wire×100                         |
| Dolorous (all)                 | 10× each × 4                     | 50× each × 4                                    |
| Miserable (Accessory/Weapon)   | 5× each × 4 + Wire×20            | 25× each × 4 + Wire×100 (+2× Mementos)          |
| Woeful (all)                   | 10× each × 5 (incl. Transformer) | 50× each × 5 (incl. Transformer) (+5× Mementos) |

## ML Values

- Heroic items and augments: ML 8
- Legendary items and augments: ML 34
- Wicked augments: ML 34 (uses Bleak Mementos + Legendary ingredients)

## Planner Mode Filter

- The Viktranium crafting page has a Heroic/Legendary mode toggle.
- Heroic mode only shows ML 8 items and heroic augment options.
- Legendary mode only shows ML 34 items and legendary augment options.
- Heroic and Legendary planned item lists are stored separately so switching mode does not discard the other plan.

## Related Files

| File                                      | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `src/domains/crafting/viktraniumLogic.ts` | Core logic, `SLOT_INGREDIENT_CONFIGS` |
| `src/pages/ViktraniumCrafting.tsx`        | UI page                               |
