# DDO Experience Point (XP) Mechanics

This document details the XP calculation system in Dungeons & Dragons Online (DDO) based on the official DDO Wiki and in-game mechanics.

## Table of Contents

1. [XP Calculation Formula](#xp-calculation-formula)
2. [Base XP](#base-xp)
3. [Additive Bonuses](#additive-bonuses)
4. [Multiplicative Bonuses](#multiplicative-bonuses)
5. [Penalties](#penalties)
6. [XP Requirements Per Level](#xp-requirements-per-level)
7. [Optimal Leveling Strategy](#optimal-leveling-strategy)

---

## XP Calculation Formula

The total XP earned from a quest is calculated as:

```
Total XP = (Subtotal) × (1 + Sum of Multiplicative Bonuses)

Where:
Subtotal = Base XP + Sum of (Base XP × Additive Bonus Percentage)
```

### Worked Example (Case A from Wiki)

Base XP: 8,686 (Jungle of Khyber, Reaper Difficulty)

**Additive Bonuses (% of Base XP):**
| Bonus | Percentage | Calculation | Running Total |
|-------|-----------|-------------|---------------|
| First Reaper Completion | 45% | 8,686 × 0.45 = 3,908 | 12,594 |
| Delving Bonus (Reaper) | 150% | 8,686 × 1.50 = 13,029 | 25,623 |
| Group Bonus (2 others) | 12% | 8,686 × 0.12 = 1,042 | 26,665 |
| Onslaught | 15% | 8,686 × 0.15 = 1,302 | 27,957 |
| Ingenious Debilitation | 30% | 8,686 × 0.30 = 2,605 | 27,967 |
| Ransack Bonus | 15% | 8,686 × 0.15 = 1,302 | 31,874 |
| Persistence Bonus | 10% | 8,686 × 0.10 = 868 | 32,742 |
| Flawless Victory | 10% | 8,686 × 0.10 = 868 | 33,610 |
| Lesser Tome of Learning | 25% | 8,686 × 0.25 = 2,171 | 35,781 |
| Daily Playthrough | 25% | 8,686 × 0.25 = 2,171 | 37,952 |

**Subtotal: 37,952**

**Multiplicative Bonuses (% of Subtotal):**
| Bonus | Percentage | Calculation |
|-------|-----------|-------------|
| Voice of the Master | 5% | 37,952 × 0.05 = 1,897 |
| Ship Buff | 5% | 37,952 × 0.05 = 1,897 |
| 30% XP Elixir | 30% | 37,952 × 0.30 = 11,385 |
| VIP Bonus | 10% | 37,952 × 0.10 = 3,795 |

**Total Multiplicative: 18,974**

**Grand Total: 37,952 + 18,974 = 56,926 XP**

---

## Base XP

Base XP is determined by the quest and difficulty:

- Each quest has fixed base XP values for each difficulty level
- Available from DDO Audit API: `heroic_normal`, `heroic_hard`, `heroic_elite`, `epic_normal`, `epic_hard`, `epic_elite`
- Solo quests may only have `heroic_casual` XP

---

## Additive Bonuses

All additive bonuses are calculated as a percentage of the **Base XP**.

### First-Time Difficulty Completion (One-time per life)

| Difficulty | Bonus |
| ---------- | ----- |
| Solo       | 20%   |
| Casual     | 20%   |
| Normal     | 20%   |
| Hard       | 20%   |
| Elite      | 45%   |
| Reaper\*   | 45%   |

\*Reaper is treated as a single difficulty regardless of skull count.

### Delving Bonus (One-time per life, retroactive)

The maximum Delving bonus is awarded when running a quest on Reaper difficulty for the first time per life, **if**:

- **Heroic quest**: Highest level character is within 2 levels of quest's effective level
- **Epic/Legendary quest**: Every group member is within 4 levels of quest's effective level

The Delving bonus is split into three 50% bonuses:

- 50% for Hard (or higher)
- 50% for Elite (or higher)
- 50% for Reaper

**Total potential: 150% of Base XP**

If any character is above the level threshold, the Delving bonus is **halved** (75% max).

### Party Quest XP Modifiers

These bonuses are applied to all party members:

#### Killing Monsters

| Bonus        | Percentage | Requirement                      |
| ------------ | ---------- | -------------------------------- |
| Aggression   | 10%        | Kill a large portion of monsters |
| Onslaught    | 15%        | Kill more monsters               |
| **Conquest** | **25%**    | Kill most/all monsters           |

#### Pacifism (low kills)

| Bonus                 | Percentage | Requirement                  |
| --------------------- | ---------- | ---------------------------- |
| Discreet              | 5%         | Complete with very few kills |
| Devious               | 7%         | Even fewer kills             |
| **Insidious Cunning** | **10%**    | Minimal kills                |

#### Disarming Traps

| Bonus                      | Percentage | Requirement           |
| -------------------------- | ---------- | --------------------- |
| Tamper                     | 10%        | Disarm some traps     |
| Neutralization             | 20%        | Disarm most traps     |
| **Ingenious Debilitation** | **30%**    | Disarm all/most traps |

#### Finding Secret Doors

| Bonus              | Percentage | Requirement            |
| ------------------ | ---------- | ---------------------- |
| Observance         | 8%         | Find some secret doors |
| Perception         | 10%        | Find most secret doors |
| **Vigilant Sight** | **15%**    | Find all secret doors  |

#### Destroying Breakables

| Bonus       | Percentage | Requirement            |
| ----------- | ---------- | ---------------------- |
| Mischief    | 8%         | Break some objects     |
| Vandal      | 10%        | Break more objects     |
| **Ransack** | **15%**    | Break most/all objects |

### Persistence Bonus (Party)

**10%** bonus if no party member leaves the quest for any reason.

### Flawless Victory

**+10%** bonus if no party member dies. (Unconsciousness without releasing is not death)

### Tome of Learning

Tomes provide bonuses in two ways:

#### First-Time Bonus (Heroic quests, first completion per life)

| Tome                          | Heroic First-Time | Epic First-Time |
| ----------------------------- | ----------------- | --------------- |
| Lesser Tome of Learning       | 25%               | 15%             |
| Greater Tome of Learning      | 50%               | 25%             |
| Lesser Tome of Epic Learning  | 5%                | 5%              |
| Greater Tome of Epic Learning | 10%               | 10%             |

#### All XP Bonus

| Tome                          | Bonus  |
| ----------------------------- | ------ |
| Lesser Tome of Learning       | 5-10%  |
| Greater Tome of Learning      | 10-20% |
| Lesser Tome of Epic Learning  | 5%     |
| Greater Tome of Epic Learning | 10%    |

### Daily Bonus

Completing a specific quest for the first time in a day (after 18 hours since last completion):

- **Heroic quests**: 25% bonus
- **Epic quests**: 40% bonus

### Group Bonus

During **DDO Buddy Weekend** events:

- Regular quests: 10% XP per other player (50% max)
- Raids: 5% XP per other player (55% max)

_Note: This is an event bonus, not always active_

VIP players and Season Pass holders also get:

- 1% XP boost per player, up to 5% for party, 11% for raid

---

## Multiplicative Bonuses

These bonuses are calculated as a percentage of the **Subtotal** (Base XP + all additive bonuses).

| Bonus               | Percentage   | Source                |
| ------------------- | ------------ | --------------------- |
| Voice of the Master | 5%           | Item (Delera's chain) |
| Ship Buff           | 5%           | Guild airship amenity |
| XP Elixir           | 10/20/30/50% | DDO Store item        |
| VIP Bonus           | 10%          | VIP subscription      |

**Important**: VIP bonus is multiplicative and applied after all others. It is shown in the chat log but not in the XP overview window.

---

## Penalties

### Over-Level Penalty (Heroic only)

Compares the quest's **Heroic effective level** to the **highest-level character** in the party:

| Level Difference        | Penalty          |
| ----------------------- | ---------------- |
| At or below quest level | 0%               |
| +1 level above          | 0%               |
| +2 levels above         | 10%              |
| +3 levels above         | 25%              |
| +4 levels above         | 50%              |
| +5 levels above         | 75%              |
| +6 levels above         | 99%              |
| +7 or more              | **100%** (no XP) |

**Note**: This penalty does NOT apply to:

- Epic or Legendary quests
- Heroic quests with effective level 20 or higher

### Quest Ransack Penalty

Each time you repeat a quest, the XP decreases by **20%** (minimum 20% of original):

- 1st completion: 100%
- 2nd completion: 80%
- 3rd completion: 60%
- 4th completion: 40%
- 5th+ completion: 20%

The penalty decreases by **50%** every **18 hours** after the most recent completion.

**Waived if**: Running on a first-time difficulty (the first-time bonus negates ransack).

### Power-Leveling Penalty (Individual)

Applies when questing with characters **4 or more levels above yours**:

| Level Difference  | Penalty                      |
| ----------------- | ---------------------------- |
| 3 or fewer levels | 0%                           |
| 4 levels above    | 50%                          |
| 5 levels above    | 75%                          |
| 6 levels above    | 87.5%                        |
| 7+ levels above   | Multiplicative 50% per level |

**Note**: Epic and Legendary characters do NOT receive this penalty.

### Death Penalty

Dying removes the 10% Flawless Victory bonus.

### Reentry Penalty (Individual)

Each time a player reenters a quest:

- 1st reentry: 20% penalty
- 2nd reentry: 40% penalty
- 3rd reentry: 60% penalty
- 4th reentry: 80% penalty
- 5th+ reentry: 90% penalty (max)

**Note**: Does not apply on Solo or Casual difficulty.

### Late Entry Penalty

Entering the dungeon 10+ minutes after it opened:

- Less than 25% of completion duration: 80% penalty
- 25-50% of completion duration: 50% penalty

---

## XP Requirements Per Level

### Heroic Levels (1-20)

XP needed increases based on True Reincarnation (TR) count.

#### Lives 1-3 (Base)

| Level      | Level Up  | 1st Rank  | 2nd Rank  | 3rd Rank  | 4th Rank  | Per Rank |
| ---------- | --------- | --------- | --------- | --------- | --------- | -------- |
| 1 (1-5)    | -         | 800       | 1,600     | 2,400     | 3,200     | 800      |
| 2 (6-10)   | 4,000     | 6,400     | 8,800     | 11,200    | 13,600    | 2,400    |
| 3 (11-15)  | 16,000    | 20,800    | 25,600    | 30,400    | 35,200    | 4,800    |
| 4 (16-20)  | 40,000    | 46,400    | 52,800    | 59,200    | 65,600    | 6,400    |
| 5 (21-25)  | 72,000    | 80,000    | 88,000    | 96,000    | 104,000   | 8,000    |
| 6 (26-30)  | 112,000   | 121,600   | 131,200   | 140,800   | 150,400   | 9,600    |
| 7 (31-35)  | 160,000   | 173,000   | 186,000   | 199,000   | 212,000   | 13,000   |
| 8 (36-40)  | 225,000   | 241,000   | 257,000   | 273,000   | 289,000   | 16,000   |
| 9 (41-45)  | 305,000   | 324,000   | 343,000   | 362,000   | 381,000   | 19,000   |
| 10 (46-50) | 400,000   | 422,000   | 444,000   | 466,000   | 488,000   | 22,000   |
| 11 (51-55) | 510,000   | 534,000   | 558,000   | 582,000   | 606,000   | 24,000   |
| 12 (56-60) | 630,000   | 656,000   | 682,000   | 708,000   | 734,000   | 26,000   |
| 13 (61-65) | 760,000   | 788,000   | 816,000   | 844,000   | 872,000   | 28,000   |
| 14 (66-70) | 900,000   | 930,000   | 960,000   | 990,000   | 1,020,000 | 30,000   |
| 15 (71-75) | 1,050,000 | 1,082,000 | 1,114,000 | 1,146,000 | 1,178,000 | 32,000   |
| 16 (76-80) | 1,210,000 | 1,243,000 | 1,276,000 | 1,309,000 | 1,342,000 | 33,000   |
| 17 (81-85) | 1,375,000 | 1,409,000 | 1,443,000 | 1,477,000 | 1,511,000 | 34,000   |
| 18 (86-90) | 1,545,000 | 1,580,000 | 1,615,000 | 1,650,000 | 1,685,000 | 35,000   |
| 19 (91-95) | 1,720,000 | 1,756,000 | 1,792,000 | 1,828,000 | 1,864,000 | 36,000   |
| 20 (cap)   | 1,900,000 | -         | -         | -         | -         | -        |

**Total XP for Level 20**: 1,900,000

#### Lives 4-7 (+50% XP required)

| Level    | Level Up  | 1st Rank | 2nd Rank | 3rd Rank | 4th Rank | Per Rank |
| -------- | --------- | -------- | -------- | -------- | -------- | -------- |
| 1 (1-5)  | 0         | 1,200    | 2,400    | 3,600    | 4,800    | 1,200    |
| 2 (6-10) | 6,000     | 9,600    | 13,200   | 16,800   | 20,400   | 3,600    |
| ...      | ...       | ...      | ...      | ...      | ...      | ...      |
| 20 (cap) | 2,850,000 | -        | -        | -        | -        | -        |

**Total XP for Level 20**: 2,850,000

#### Lives 8+ (+100% XP required)

| Level    | Level Up  | 1st Rank | 2nd Rank | 3rd Rank | 4th Rank | Per Rank |
| -------- | --------- | -------- | -------- | -------- | -------- | -------- |
| 1 (1-5)  | 0         | 1,600    | 3,200    | 4,800    | 6,400    | 1,600    |
| 2 (6-10) | 8,000     | 12,800   | 17,600   | 22,400   | 27,200   | 4,800    |
| ...      | ...       | ...      | ...      | ...      | ...      | ...      |
| 20 (cap) | 3,800,000 | -        | -        | -        | -        | -        |

**Total XP for Level 20**: 3,800,000

### Epic Levels (20-30)

Epic XP requirements do NOT change based on TR count.

| Level | Rank 0 (Level Up) | Rank 1    | Rank 2    | Rank 3    | Rank 4    | Per Rank | Per Level |
| ----- | ----------------- | --------- | --------- | --------- | --------- | -------- | --------- |
| 20    | 0                 | 120,000   | 240,000   | 360,000   | 480,000   | 120,000  | 600,000   |
| 21    | 600,000           | 730,000   | 860,000   | 990,000   | 1,120,000 | 130,000  | 650,000   |
| 22    | 1,250,000         | 1,390,000 | 1,530,000 | 1,670,000 | 1,810,000 | 140,000  | 700,000   |
| 23    | 1,950,000         | 2,100,000 | 2,250,000 | 2,400,000 | 2,550,000 | 150,000  | 750,000   |
| 24    | 2,700,000         | 2,860,000 | 3,020,000 | 3,180,000 | 3,340,000 | 160,000  | 800,000   |
| 25    | 3,500,000         | 3,670,000 | 3,840,000 | 4,010,000 | 4,180,000 | 170,000  | 850,000   |
| 26    | 4,350,000         | 4,530,000 | 4,710,000 | 4,890,000 | 5,070,000 | 180,000  | 900,000   |
| 27    | 5,250,000         | 5,440,000 | 5,630,000 | 5,820,000 | 6,010,000 | 190,000  | 950,000   |
| 28    | 6,200,000         | 6,400,000 | 6,600,000 | 6,800,000 | 7,000,000 | 200,000  | 1,000,000 |
| 29    | 7,200,000         | 7,410,000 | 7,620,000 | 7,830,000 | 8,040,000 | 210,000  | 1,050,000 |
| 30    | 8,250,000         | -         | -         | -         | -         | -        | -         |

**Total XP for Level 30 (from 20)**: 8,250,000

### Legendary Levels (30-34)

Legendary XP is NOT lost on reincarnation.

| Level | Rank 0    | Rank 1    | Rank 2    | Rank 3    | Rank 4    | Per Rank | Per Level |
| ----- | --------- | --------- | --------- | --------- | --------- | -------- | --------- |
| 30    | 0         | 320,000   | 640,000   | 960,000   | 1,280,000 | 320,000  | 1,600,000 |
| 31    | 1,600,000 | 2,000,000 | 2,400,000 | 2,800,000 | 3,200,000 | 400,000  | 2,000,000 |
| 32    | 3,600,000 | 4,020,000 | 4,440,000 | 4,860,000 | 5,280,000 | 420,000  | 2,100,000 |
| 33    | 5,700,000 | 6,140,000 | 6,580,000 | 7,020,000 | 7,460,000 | 440,000  | 2,200,000 |
| 34    | 7,900,000 | -         | -         | -         | -         | -        | -         |

---

## Optimal Leveling Strategy

### "Art" of Gaining XP

The most efficient leveling strategy since the introduction of Delving bonuses:

1. **Run Reaper difficulty at least once** to get 150% Delving bonus (retroactive for Hard/Elite)
2. **Stay within level range**:
   - Heroic: All party members at or below quest level + 2
   - Epic/Legendary: All party members within 4 levels of quest
3. **First-time completion bonuses stack**:
   - Run Casual/Normal/Hard to get 20% each (60% total)
   - Run Elite/Reaper to get 45%
   - Order doesn't matter for first-time bonuses

### Difficulty Order Efficiency

Since lower difficulties (Casual, Normal, Hard) give lower base XP, the most **time-efficient** approach is:

- Run Elite or Reaper first for maximum base XP + first-time bonus
- Then run different quests rather than repeating on easier difficulties

### VIP Group Bonus

VIP players and Season Pass holders get:

- 1% XP per other player (max 5% party, 11% raid)
- Stacks with weekend bonuses and elixirs

---

## Implementation Notes

### For TR Planner Calculator

1. **Default assumptions for "ideal" run**:
   - First Reaper completion: Yes (45%)
   - Full Delving bonus: Yes (150%)
   - No group bonus (solo): 0%
   - Conquest: Yes (25%)
   - Ingenious Debilitation: Configurable
   - Ransack: Yes (15%)
   - Persistence: Yes (10%)
   - Flawless Victory: Yes (10%)
   - Tome: Configurable (Lesser 25%, Greater 50%)
   - Daily bonus: Yes (25% Heroic, 40% Epic)

2. **Typical multiplicative bonuses**:
   - Voice of the Master: Yes (5%)
   - Ship Buff: Yes (5%)
   - XP Elixir: 30% or 50%
   - VIP: Configurable (10%)

3. **Quest effective level range**:
   - A quest is "optimal" if character level ≤ quest CR + 2 (Heroic) or + 4 (Epic)
   - Show warning if quest is too low level (wasted efficiency)
   - Show error if quest is too high level (over-level penalty)

4. **Ransack timer consideration**:
   - For planning purposes, assume each quest is run only once (no ransack penalty)
   - This aligns with "ideal case: each quest only do reaper 1 once"

---

## Data Sources

- DDO Wiki: https://ddowiki.com/page/Experience_point
- DDO Audit API: https://api.ddoaudit.com/v1/quests
- Quest XP values in API include all difficulty levels
