---
name: ddo-raids
description: "DDO raid lockout timer logic, tier filtering, and character grouping. Use when modifying raid timers, raid lockout duration, raid sorting, raid entry availability, tier filtering (heroic/epic/legendary), or the buildRaidGroups function."
---

# DDO Raid Timer Logic

## When to Use

- Modifying raid lockout timer logic or duration
- Changing raid tier filtering (heroic/epic/legendary)
- Updating raid grouping or sorting behavior
- Working with `buildRaidGroups()`, `isEntryAvailable()`, or `isLevelInTier()`
- Changing raid update/patch sorting

## Game Rules

### Raid Lockout Duration

- **Standard Lockout**: 2 days + 18 hours (66 hours total) after completing a raid
- Timer starts immediately upon raid completion
- Character cannot receive loot/credit until timer expires

### Level Tiers

| Tier      | Level Range | Description         |
| --------- | ----------- | ------------------- |
| Heroic    | 1-19        | Rarely tracked      |
| Epic      | 20-29       | Standard endgame    |
| Legendary | 30+         | Highest-level raids |

**Note**: App only tracks raids with quest level ≥ 20.

## Key Constants

**File**: `src/api/ddoAudit/constants.ts`

```typescript
export const HOUR_IN_MS = 60 * 60 * 1000;
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * HOUR_IN_MS; // 66 hours = 237,600,000 ms
```

## Core Functions

**File**: `src/domains/raids/raidLogic.ts`

### `isLevelInTier(lvl, tierFilter)`

- `'all'`: Always true
- `'heroic'`: level < 20
- `'epic'`: level >= 20 AND level <= 29
- `'legendary'`: level >= 30

### `isEntryAvailable(entry, now)`

1. No `lastTimestamp` → Available
2. Timer manually ignored (localStorage) → Available
3. `readyAt = lastTimestamp + RAID_LOCKOUT_MS`
4. `now >= readyAt` → Available, else On Timer

### `buildRaidGroups({ raidActivity, questsById, charactersById })`

1. Iterate all raid activity entries
2. Filter to raids with level ≥ 20
3. Group by normalized raid name (case-insensitive)
4. Collapse duplicate quest IDs (keep highest level)
5. Add placeholder entries for all tracked characters
6. Include all raid-type quests even without activity
7. Return unsorted list (UI handles sorting)

## Data Structures

```typescript
interface RaidEntry {
  characterId: string;
  characterName: string;
  playerName: string;
  totalLevel: number;
  classes: CharacterClass[];
  race: string;
  lastTimestamp: string | null;
  isOnline: boolean;
  isInRaid: boolean;
}

interface RaidGroup {
  questId: string;
  raidName: string;
  adventurePack?: string | null;
  questLevel: number | null;
  entries: RaidEntry[];
}
```

## UI Sorting Order

**File**: `src/components/raids/RaidTimerSection.tsx`

Priority (descending):

1. Friends in raid (currently inside)
2. Active LFM posts
3. Quest level (higher first)
4. Update patch (newer first, via `src/domains/raids/raidUpdates.ts`)
5. Has timer data
6. Original index (stable sort)

## Ignored Timers (Client-side)

Storage key: `ddoaudit_ignoredTimers_v1`

Functions: `getIgnoredTimers()`, `isTimerIgnored()`, `addIgnoredTimer()`, `removeIgnoredTimer()`

## Related Files

| File                                        | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| `src/domains/raids/raidLogic.ts`            | Core raid grouping and timer logic |
| `src/domains/raids/raidNotes.ts`            | Raid notes parsing                 |
| `src/domains/raids/raidUpdates.ts`          | Raid update version mapping        |
| `src/api/ddoAudit/constants.ts`             | Lockout duration constant          |
| `src/api/ddoAudit/helpers.ts`               | Time formatting utilities          |
| `src/config/characters.ts`                  | Character-to-player mapping        |
| `src/components/raids/RaidTimerSection.tsx` | UI sorting and filtering           |
