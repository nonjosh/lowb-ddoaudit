# XP Bonus Configuration Details

## XPBonusConfig Interface

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
  groupBonusPlayers: number; // 0-11
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
  xpElixir: 0 | 10 | 20 | 30 | 50;
  vipBonus: boolean; // 10%
  vipGroupBonus: boolean; // 1% per player, max 5%/11%
  weeklyBonus: 0 | 5 | 10 | 15 | 20 | 25 | 30;
}
```

## Default Configuration (Optimal TR Run)

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

## Additive Bonus Values

### First-Time Completion

| Difficulty | Bonus |
| ---------- | ----- |
| none       | 0%    |
| casual     | 20%   |
| normal     | 20%   |
| hard       | 20%   |
| elite      | 45%   |
| reaper     | 45%   |

### Delving Bonus

| Setting | Bonus |
| ------- | ----- |
| none    | 0%    |
| half    | 75%   |
| full    | 150%  |

### Tome of Learning (First-time)

- Heroic: lesser = 25%, greater = 50%
- Epic: lesser = 15%, greater = 25%
