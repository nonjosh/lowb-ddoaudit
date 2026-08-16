---
name: ddo-ransack
description: "DDO chest ransack timer tracking, 168-hour duration, gradual recovery, IndexedDB storage via Dexie, and ransack CRUD operations. Use when modifying ransack timers, ransack recovery schedule, ransack storage, or the ransack UI."
---

# DDO Ransack Timer Logic

## When to Use

- Modifying ransack timer duration or recovery logic
- Working with ransack storage (IndexedDB/Dexie)
- Changing ransack timer CRUD operations
- Updating the ransack timer UI or context

## Game Rules

### Ransack Mechanic

| Chest Opening | Drop Rate |
| ------------- | --------- |
| 1st           | 100%      |
| 2nd           | 80%       |
| 3rd           | 60%       |
| 4th           | 40%       |
| 5th+          | 20%       |

### Timer Duration

- **Full Duration**: 7 days (168 hours)
- Penalty decreases by **50%** every **18 hours** (logarithmic recovery)
- First-time difficulty completion waives ransack penalty

### Comparison with Raid Lockout

| Feature  | Raid Lockout   | Ransack         |
| -------- | -------------- | --------------- |
| Duration | 66 hours       | 168 hours       |
| Source   | DDO Audit API  | User-entered    |
| Recovery | Full at expiry | Gradual 50%/18h |

## Data Model

**File**: `src/storage/ransackDb.ts`

```typescript
interface RansackTimer {
  id?: number;
  characterId: string;
  characterName: string;
  questId: string;
  questName: string;
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (createdAt + 168h)
  isRansacked?: boolean; // client-side checkbox state for whether loot has already been taken
  playerName: string;
}
```

## Storage (IndexedDB via Dexie)

```typescript
// DB: 'ransack-timers'
// Table: timers — indexed by: ++id, characterId, questId, playerName, expiresAt, [characterId+questId]
```

### CRUD Operations

- `getAllRansackTimers()` / `getRansackTimersByPlayer(playerName)`
- `addRansackTimer(timer)` — Upsert by characterId+questId
- `setRansackTimerChecked(id, isRansacked)` — Persist checkbox state for an existing timer
- `deleteRansackTimer(id)` / `deleteExpiredTimers()` / `clearAllRansackTimers()`

## Context Layer

**File**: `src/contexts/RansackContext.tsx`

- Auto-refresh every 60 seconds
- Auto-delete expired timers on refresh
- Grouped by player name
- Provides: `timers`, `timersByPlayer`, `addTimer`, `deleteTimer`, `setTimerChecked`, `refreshTimers`
- Dev-only `seedRansackDemo=true` query param resets IndexedDB and seeds a deterministic Michael sample set for manual loot-ransack UI checks

## UI Behavior

- The loot-ransack table shows a persisted checkbox per row so players can start a timer before looting, then mark that character/quest pair as already ransacked later.
- New timers should initialize `isRansacked` to `false`.
- Existing records without the field should be treated as unchecked.

## Related Files

| File                              | Purpose                    |
| --------------------------------- | -------------------------- |
| `src/storage/ransackDb.ts`        | IndexedDB storage          |
| `src/contexts/RansackContext.tsx` | React context provider     |
| `src/contexts/useRansack.ts`      | Hook for accessing context |
