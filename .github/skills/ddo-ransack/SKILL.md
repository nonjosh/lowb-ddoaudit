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

### Ransack Mechanic (https://ddowiki.com/page/Chest_ransack)

- Every chest has its own ransack timer, tracked **per character** (not per difficulty).
- The timer starts on the first loot and lasts exactly **7 days (168 hours)**; later
  loots do **not** extend it, and when it expires the chest is fully normal again
  (the next loot starts a new timer).
- Loot 1–**8** inside that window is normal; **the 9th** is the first reduced one
  (ransack warning, no chest-specific named items, chest level −1 per further loot).
- At chest level 0 you get no loot at all; how fast that happens depends on the
  chest's starting level.

Do not confuse this with **quest XP ransack** (https://ddowiki.com/page/Quest_ransack):
each repeat of the same difficulty beyond the first adds a stacking −20% XP penalty
(capped at −80%) that decays 50% per 18 hours since the last completion. The two are
tracked separately; only chest/reward loot has the 8-per-7-days rule.

### Comparison with Raid Lockout

| Feature  | Raid Lockout   | Ransack         |
| -------- | -------------- | --------------- |
| Duration | 66 hours       | 168 hours       |
| Source   | DDO Audit API  | User-entered    |
| Recovery | Full at expiry | Gradual 50%/18h |

## Reward Ransack (adventure log)

The adventure log derives reward ransack from the completion history stored per
character + quest.

- Window: 7 days, limit: **8** completions — constants in
  `src/domains/adventureLog/ransack.ts`.
- Source: `history` on `completions/{character_id}_{quest_id}` (newest first, max 10),
  written by the poller and by manual edits.
- Display: a "Ransacked" chip at the limit, an "N/8 in 7d" hint above one run.
- Nothing is stored for ransack status; it is recomputed from timestamps so a changed
  rule needs no migration.

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
