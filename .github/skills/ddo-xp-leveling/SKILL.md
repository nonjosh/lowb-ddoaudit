---
name: ddo-xp-leveling
description: "DDO XP calculation, leveling, TR scaling, over-level penalties, and bonus configuration. Use when modifying XP formulas, TR multipliers, level requirements, rank conversions, additive/multiplicative bonuses, or the TR planner."
---

# DDO XP & Leveling Logic

## When to Use

- Modifying XP calculation formulas or bonus values
- Changing TR (True Reincarnation) multipliers or level scaling
- Working with rank/level conversion functions
- Updating over-level penalty logic
- Adding new XP bonus types
- Working on TR planner features

## XP Calculation Formula

```
Total XP = Subtotal × (1 + Sum of Multiplicative Bonuses)

Where:
  Subtotal = Base XP + Sum of (Base XP × Additive Bonus Percentage)
```

## Level Tiers

| Tier      | Levels | XP Type      | TR Scaling               |
| --------- | ------ | ------------ | ------------------------ |
| Heroic    | 1-20   | Heroic XP    | Yes (1x, 1.5x, or 2x)    |
| Epic      | 20-30  | Epic XP      | No                       |
| Legendary | 30-34  | Legendary XP | No (persists through TR) |

## TR XP Multipliers

| Lives | Multiplier | Total XP to Level 20 |
| ----- | ---------- | -------------------- |
| 1-3   | 1.0x       | 1,900,000            |
| 4-7   | 1.5x       | 2,850,000            |
| 8+    | 2.0x       | 3,800,000            |

## Key Constants

**File**: `src/domains/trPlanner/levelRequirements.ts`

- Heroic XP: 96 ranks (levels 1-20), 5 ranks per level
- Epic XP: 51 ranks (levels 20-30)
- Heroic cap: 1,900,000 XP (base)
- Epic cap: 8,250,000 XP

## Over-Level Penalty (Heroic Only)

**File**: `src/domains/trPlanner/xpCalculator.ts`

| Level Diff | Penalty |
| ---------- | ------- |
| 0-1        | 0%      |
| 2          | 10%     |
| 3          | 25%     |
| 4          | 50%     |
| 5          | 75%     |
| 6          | 99%     |
| 7+         | 100%    |

Epic/Legendary or quest level ≥ 20: no penalty.

## Bonus Configuration

See [XP bonus details](./references/xp-bonuses.md) for the full `XPBonusConfig` interface and all bonus values.

## Key Functions

**File**: `src/domains/trPlanner/xpCalculator.ts`

- `getBaseXP(xpData, tier, difficulty)` — Base XP from quest data (Reaper uses Elite values)
- `calculateAdditiveBonusPercentage(config, tier, isRaid)` — Sum additive %
- `calculateMultiplicativeBonusPercentage(config)` — Sum multiplicative %
- `calculateQuestXP(baseXP, config, tier, isRaid)` — Full XP calculation
- `applyOverLevelPenalty(xp, charLevel, questLevel, tier)` — Heroic penalty

**File**: `src/domains/trPlanner/levelRequirements.ts`

- `rankToLevel(rank, mode)` / `levelToStartRank(level, mode)`
- `rankToWithinLevelRank(rank, mode)` / `rankToDisplayRank(rank, mode)`
- `xpToRank(xp, mode, trTier)`
- `getOptimalQuestLevelRange(characterLevel, mode)`

## Optimal Quest Level Range

```typescript
// Heroic: min = max(1, charLevel - 1), max = charLevel + 2
// Epic:   min = max(20, charLevel - 2), max = charLevel + 4
```

## Related Files

| File                                         | Purpose                            |
| -------------------------------------------- | ---------------------------------- |
| `src/domains/trPlanner/xpCalculator.ts`      | XP calculation functions           |
| `src/domains/trPlanner/levelRequirements.ts` | Level/rank XP requirements         |
| `references/xp-mechanics.md`                 | Complete official XP documentation |
