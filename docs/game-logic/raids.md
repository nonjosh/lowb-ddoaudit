# Raid Timer Logic

## Overview

DDO raids have a **lockout timer** that prevents characters from receiving loot/credit for a raid for a period after completing it. This application tracks these timers via the DDO Audit API.

## Game Rules (DDO Official)

### Raid Lockout Duration

- **Standard Lockout**: 2 days + 18 hours (66 hours total) after completing a raid
- A character cannot receive loot or completion credit until the timer expires
- Timer starts immediately upon raid completion

### Raid Types by Level Tier

| Tier      | Level Range | Description                      |
| --------- | ----------- | -------------------------------- |
| Heroic    | 1-19        | Low-level raids (rarely tracked) |
| Epic      | 20-29       | Standard endgame raids           |
| Legendary | 30+         | Highest-level raids              |

**Note**: This app only tracks raids with quest level ≥ 20 (Epic and Legendary).

### Character Level Tiers

Characters are categorized by their **total level** (sum of all class levels):

- **Heroic**: Levels 1-19
- **Epic**: Levels 20-29
- **Legendary**: Levels 30+

## Implementation

### Constants

**File**: `src/api/ddoAudit/constants.ts`

```typescript
export const HOUR_IN_MS = 60 * 60 * 1000;
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * HOUR_IN_MS; // 66 hours = 237,600,000 ms
```

### Core Functions

**File**: `src/domains/raids/raidLogic.ts`

#### `isLevelInTier(lvl, tierFilter)`

Checks if a character level matches a tier filter:

```typescript
// Tier filtering logic:
// - 'all': Always true
// - 'heroic': level < 20
// - 'epic': level >= 20 AND level <= 29
// - 'legendary': level >= 30
```

#### `isEntryAvailable(entry, now)`

Determines if a raid entry is available (timer expired):

```typescript
// Logic:
// 1. If entry has no lastTimestamp → Available
// 2. If timer is manually ignored (localStorage) → Available
// 3. Calculate readyAt = lastTimestamp + RAID_LOCKOUT_MS
// 4. If now >= readyAt → Available, else On Timer
```

#### `buildRaidGroups({ raidActivity, questsById, charactersById })`

Groups raid activity entries by raid name:

1. **Iterate** through all raid activity entries
2. **Filter** to raids with level ≥ 20 only
3. **Group** by normalized raid name (case-insensitive)
4. **Collapse** duplicate quest IDs for same raid (keep highest level)
5. **Add placeholder entries** for all tracked characters (even without timers)
6. **Include all raid-type quests** even without activity
7. **Return** unsorted list (sorting handled by UI layer)

### Data Structures

#### RaidEntry

```typescript
interface RaidEntry {
  characterId: string;
  characterName: string;
  playerName: string; // Mapped from character name via CHARACTERS config
  totalLevel: number;
  classes: CharacterClass[];
  race: string;
  lastTimestamp: string | null; // ISO timestamp of last completion
  isOnline: boolean;
  isInRaid: boolean; // Currently in this raid's area
}
```

#### RaidGroup

```typescript
interface RaidGroup {
  questId: string;
  raidName: string;
  adventurePack?: string | null;
  questLevel: number | null;
  entries: RaidEntry[];
}
```

### Character-to-Player Mapping

**File**: `src/config/characters.ts`

Players are mapped to characters via two data files:

1. `src/data/lowb.json` - Player name → character names array
2. `src/data/character_ids.csv` - Character name → character ID

The `getPlayerName(characterName)` function looks up which player owns a character.

### Timer Display Helpers

**File**: `src/api/ddoAudit/helpers.ts`

- `formatReadyAt(ts)` - Formats when a timer will be ready
- `formatTimeRemaining(remainingMs)` - Formats countdown: "Xd Yh Zm"
- `addMs(ts, ms)` - Adds milliseconds to a timestamp

### Ignored Timers (Client-side)

Users can manually ignore timers via localStorage:

```typescript
// Storage key: 'ddoaudit_ignoredTimers_v1'
interface IgnoredTimerRecord {
  characterId: string;
  lastTimestamp: string | null;
}
```

Functions: `getIgnoredTimers()`, `isTimerIgnored()`, `addIgnoredTimer()`, `removeIgnoredTimer()`

### UI Sorting Order

**File**: `src/components/raids/RaidTimerSection.tsx`

The raid list is sorted by multiple criteria in priority order:

1. **Friends in raid** - Raids with expected players currently inside (highest priority)
2. **Active LFM** - Raids with Looking-for-More posts
3. **Quest level** - Higher level raids first (descending)
4. **Update patch** - For same level, newer updates first (e.g., U75 > U72)
5. **Has timer** - Raids with timer data before those without
6. **Original index** - Stable sort fallback

**File**: `src/domains/raids/raidUpdates.ts`

Provides update patch information via `RAID_UPDATE_MAP` and helper functions:

- `getRaidUpdate(raidName)` - Returns update string (e.g., "U75")
- `getRaidUpdateNumber(raidName)` - Returns numeric version for sorting (e.g., 75.7)

## Related Files

| File                                                                                         | Purpose                                   |
| -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [src/domains/raids/raidLogic.ts](../../src/domains/raids/raidLogic.ts)                       | Core raid grouping and timer logic        |
| [src/domains/raids/raidNotes.ts](../../src/domains/raids/raidNotes.ts)                       | Raid notes parsing (augments, sets, tips) |
| [src/domains/raids/raidUpdates.ts](../../src/domains/raids/raidUpdates.ts)                   | Raid update version mapping               |
| [src/api/ddoAudit/constants.ts](../../src/api/ddoAudit/constants.ts)                         | Lockout duration constant                 |
| [src/api/ddoAudit/helpers.ts](../../src/api/ddoAudit/helpers.ts)                             | Time formatting utilities                 |
| [src/config/characters.ts](../../src/config/characters.ts)                                   | Character-to-player mapping               |
| [src/components/raids/RaidTimerSection.tsx](../../src/components/raids/RaidTimerSection.tsx) | UI sorting and filtering                  |

## Changelog

| Date    | Change                   | Reason                                       |
| ------- | ------------------------ | -------------------------------------------- |
| 2024-01 | Initial implementation   | Core raid timer tracking                     |
| 2024-02 | Added ignored timers     | Allow users to dismiss known timers          |
| 2024-03 | Added isInRaid detection | Show when characters are currently in a raid |
| 2026-02 | Sort by update patch     | For same-level raids, newer updates first    |
