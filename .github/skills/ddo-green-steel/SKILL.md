---
name: ddo-green-steel
description: "DDO Heroic Green Steel crafting at The Shroud altars, 3-tier system, elements, essences, gems, focuses, energy cells, and crafting effects. Use when modifying GS crafting logic, ingredient tracking, effect selection, or the Green Steel crafting page."
---

# DDO Green Steel (Heroic) Crafting

## When to Use

- Modifying Green Steel crafting logic or ingredient tracking
- Adding/changing GS effects or element combinations
- Working with the GS crafting page UI
- Comparing GS vs LGS differences

## Altars and Tiers

| Tier | Altar                | Focus Prefix | Essences  | Gems     | Energy Cell                  |
| ---- | -------------------- | ------------ | --------- | -------- | ---------------------------- |
| 1    | Altar of Invasion    | Inferior     | Diluted   | Cloudy   | Shavarath Low Energy Cell    |
| 2    | Altar of Subjugation | (none)       | Distilled | Pristine | Shavarath Medium Energy Cell |
| 3    | Altar of Devastation | Superior     | Pure      | Flawless | Shavarath High Energy Cell   |

Each tier: **1× Focus + 3× Essence + 3× Gem + 1× Energy Cell**

## Elements

Water, Fire, Earth, Air, Positive, Negative

## Essence & Gem Types

- **Ethereal Essence** — spell power, lore, resistance, weapon burst
- **Material Essence** — stat bonuses, alignment weapon effects
- **Gem of Dominion** — spell power or stat effects
- **Gem of Escalation** — lore or stat effects
- **Gem of Opposition** — resistance or weapon effects

## Effect Combinations

See [GS effects reference](./references/gs-effects.md) for the complete effect table.

### Key GS-Only Effect

**Disruption** (Positive + Ethereal + Opposition) — Destroys undead on crit. **Not available in LGS** (replaced by Righteousness).

## Key Differences from LGS

| Aspect            | GS (Heroic)          | LGS (Legendary)           |
| ----------------- | -------------------- | ------------------------- |
| Ingredient source | Direct drops         | 6 raw → manufactured      |
| Tier 2 prefixes   | Distilled / Pristine | No prefix                 |
| Disruption        | Available            | Replaced by Righteousness |

## Related Files

| File                                      | Purpose                    |
| ----------------------------------------- | -------------------------- |
| `src/domains/crafting/greenSteelLogic.ts` | Core logic (`gsOnly` flag) |
| `src/pages/GreenSteelCrafting.tsx`        | UI page                    |
