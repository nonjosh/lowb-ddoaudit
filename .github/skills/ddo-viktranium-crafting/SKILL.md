---
name: ddo-viktranium-crafting
description: "DDO Viktranium Experiment crafting from Chill of Ravenloft (U75), slot types (Melancholic/Dolorous/Miserable/Woeful), ingredient costs, Bleak ingredients, Wicked variants, and heroic/legendary thresholds. Use when modifying Viktranium crafting logic, ingredient tracking, or the Viktranium crafting page."
---

# DDO Viktranium Experiment Crafting

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

## ML Threshold

- Heroic augments: ML ≤ 20
- Legendary augments: ML > 20
- Wicked augments: ML > 20 (uses Bleak Mementos + Legendary ingredients)

## Related Files

| File                                      | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `src/domains/crafting/viktraniumLogic.ts` | Core logic, `SLOT_INGREDIENT_CONFIGS` |
| `src/pages/ViktraniumCrafting.tsx`        | UI page                               |
