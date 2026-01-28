# XP & Leveling Logic

## Overview

DDO uses a complex XP system with base XP, additive bonuses (% of base), and multiplicative bonuses (% of subtotal). XP requirements also scale based on True Reincarnation (TR) count.

**Primary Reference**: [ddo-xp-mechanics.md](../ddo-xp-mechanics.md) - Complete official DDO XP documentation

## Game Rules (DDO Official)

### XP Calculation Formula

```
Total XP = Subtotal × (1 + Sum of Multiplicative Bonuses)

Where:
  Subtotal = Base XP + Sum of (Base XP × Additive Bonus Percentage)
```

### Level Tiers

| Tier      | Levels | XP Type      | TR Scaling               |
| --------- | ------ | ------------ | ------------------------ |
| Heroic    | 1-20   | Heroic XP    | Yes (1x, 1.5x, or 2x)    |
| Epic      | 20-30  | Epic XP      | No                       |
| Legendary | 30-34  | Legendary XP | No (persists through TR) |

### TR XP Multipliers

| Lives | Multiplier | Total XP to Level 20 |
| ----- | ---------- | -------------------- |
| 1-3   | 1.0x       | 1,900,000            |
| 4-7   | 1.5x       | 2,850,000            |
| 8+    | 2.0x       | 3,800,000            |

### Rank System

Each level has **5 ranks** (0-4). Total ranks:

- Heroic: 96 ranks (levels 1-20)
- Epic: 51 ranks (levels 20-30, rank 0 at level 20)

## Implementation

### Constants & Data

**File**: `src/domains/trPlanner/levelRequirements.ts`

```typescript
// TR Multipliers
export type TRTier = "1-3" | "4-7" | "8+";

function getTRMultiplier(trTier: TRTier): number {
  switch (trTier) {
    case "1-3":
      return 1.0;
    case "4-7":
      return 1.5;
    case "8+":
      return 2.0;
  }
}

// Heroic XP requirements per rank (base, 96 entries)
const HEROIC_XP_BASE: number[] = [
  // Level 1 (ranks 1-5): 0, 800, 1600, 2400, 3200
  // Level 2 (ranks 6-10): 4000, 6400, 8800, 11200, 13600
  // ... continues to level 20 (rank 96): 1,900,000
];

// Epic XP requirements (51 entries, no TR scaling)
const EPIC_XP_REQUIREMENTS: number[] = [
  // Level 20 (ranks 0-4): 0, 120000, 240000, 360000, 480000
  // Level 21 (ranks 5-9): 600000, 730000, 860000, 990000, 1120000
  // ... continues to level 30 (rank 50): 8,250,000
];
```

### XP Bonus Configuration

**File**: `src/domains/trPlanner/xpCalculator.ts`

```typescript
export interface XPBonusConfig {
  // Additive bonuses (% of base XP)
  firstTimeCompletion:
    | "none"
    | "casual"
    | "normal"
    | "hard"
    | "elite"
    | "reaper";
  delvingBonus: "none" | "half" | "full"; // 0%, 75%, or 150%
  groupBonusPlayers: number; // 0-11 other players
  conquest: boolean; // 25%
  ingeniousDebilitation: boolean; // 30%
  ransackBonus: boolean; // 15%
  persistenceBonus: boolean; // 10%
  flawlessVictory: boolean; // 10%
  tomeOfLearning: "none" | "lesser" | "greater"; // 25% or 50% heroic
  dailyBonus: boolean; // 25% heroic, 40% epic

  // Multiplicative bonuses (% of subtotal)
  voiceOfTheMaster: boolean; // 5%
  shipBuff: boolean; // 5%
  xpElixir: 0 | 10 | 20 | 30 | 50; // percentage
  vipBonus: boolean; // 10%
  vipGroupBonus: boolean; // 1% per player, max 5%/11%
  weeklyBonus: 0 | 5 | 10 | 15 | 20 | 25 | 30; // weekly random
}
```

### Default Configuration (Optimal TR Run)

```typescript
export const DEFAULT_BONUS_CONFIG: XPBonusConfig = {
  firstTimeCompletion: "reaper", // 45%
  delvingBonus: "full", // 150%
  groupBonusPlayers: 0,
  conquest: true, // 25%
  ingeniousDebilitation: false,
  ransackBonus: true, // 15%
  persistenceBonus: true, // 10%
  flawlessVictory: true, // 10%
  tomeOfLearning: "greater", // 50%
  dailyBonus: true, // 25%
  voiceOfTheMaster: true, // 5%
  shipBuff: true, // 5%
  xpElixir: 0,
  vipBonus: true, // 10%
  vipGroupBonus: false,
  weeklyBonus: 0,
};
```

### Additive Bonus Values

```typescript
// First-time completion bonuses
const FIRST_TIME_BONUS = {
  none: 0,
  casual: 0.2,
  normal: 0.2,
  hard: 0.2,
  elite: 0.45,
  reaper: 0.45,
};

// Delving bonus (retroactive with Reaper)
const DELVING_BONUS = {
  none: 0,
  half: 0.75, // Over-level but eligible
  full: 1.5, // All characters in level range
};

// Tome of Learning first-time
// Heroic: lesser=25%, greater=50%
// Epic: lesser=15%, greater=25%
```

### Over-Level Penalty (Heroic Only)

**File**: `src/domains/trPlanner/xpCalculator.ts`

```typescript
export function applyOverLevelPenalty(
  xp: number,
  characterLevel: number,
  questLevel: number,
  tier: QuestTier,
): number {
  // Epic/Legendary or level 20+ heroic: no penalty
  if (tier === "epic" || questLevel >= 20) return xp;

  const levelDiff = characterLevel - questLevel;

  if (levelDiff <= 1) return xp; // 0%
  if (levelDiff === 2) return Math.floor(xp * 0.9); // 10%
  if (levelDiff === 3) return Math.floor(xp * 0.75); // 25%
  if (levelDiff === 4) return Math.floor(xp * 0.5); // 50%
  if (levelDiff === 5) return Math.floor(xp * 0.25); // 75%
  if (levelDiff === 6) return Math.floor(xp * 0.01); // 99%
  return 0; // +7: no XP
}
```

### Key Functions

#### `getBaseXP(xpData, tier, difficulty)`

Returns base XP from quest data. Reaper uses Elite XP values.

#### `calculateAdditiveBonusPercentage(config, tier, isRaid)`

Sums all additive bonus percentages based on configuration.

#### `calculateMultiplicativeBonusPercentage(config)`

Sums all multiplicative bonus percentages.

#### `calculateQuestXP(baseXP, config, tier, isRaid)`

Full XP calculation returning:

- `baseXP`, `additiveBonus`, `subtotal`
- `multiplicativeBonus`, `totalXP`, `bonusPercentage`

#### Rank/Level Conversion Functions

```typescript
rankToLevel(rank, mode); // Convert rank to level
levelToStartRank(level, mode); // First rank of a level
rankToWithinLevelRank(rank, mode); // 0-4 within-level rank
rankToDisplayRank(rank, mode); // DDO's displayed rank
xpToRank(xp, mode, trTier); // XP amount to rank
```

### Optimal Quest Level Range

```typescript
function getOptimalQuestLevelRange(characterLevel, mode) {
  if (mode === "heroic") {
    return {
      min: Math.max(1, characterLevel - 1), // 1 below
      max: characterLevel + 2, // 2 above (full delving)
    };
  } else {
    return {
      min: Math.max(20, characterLevel - 2), // 2 below
      max: characterLevel + 4, // 4 above
    };
  }
}
```

## Related Files

| File                                                                                           | Purpose                    |
| ---------------------------------------------------------------------------------------------- | -------------------------- |
| [src/domains/trPlanner/xpCalculator.ts](../../src/domains/trPlanner/xpCalculator.ts)           | XP calculation functions   |
| [src/domains/trPlanner/levelRequirements.ts](../../src/domains/trPlanner/levelRequirements.ts) | Level/rank XP requirements |
| [src/docs/ddo-xp-mechanics.md](../../src/docs/ddo-xp-mechanics.md)                             | Complete XP documentation  |

## Changelog

| Date    | Change                   | Reason                         |
| ------- | ------------------------ | ------------------------------ |
| 2024-01 | Initial TR planner logic | Support XP planning            |
| 2024-02 | Added over-level penalty | Accurate heroic XP calculation |
