---
name: ddo-adventure-log
description: "Adventure log: infers DDO quest completions from character location changes via the DDO Audit API, stores them in Firestore behind a Cloud Run service, and lets players correct them by hand. Use when changing the poller rules, area-to-quest mapping, level disambiguation, completion timestamps, or the adventure log API/page."
---

# DDO Adventure Log

## When to Use

- Changing how a quest completion is inferred (`server/src/detect.ts`)
- Changing the area-to-quest mapping, wilderness/public-hub exclusion, or heroic/legendary disambiguation
- Touching the poller cadence, the state document, or the completion schema
- Changing the `/completions` API, the write password flow, or the SPA page

## Why it exists

DDO Audit exposes character **location** history but no quest-completion endpoint, and it
does not expose its internal `quest_sessions` table. The adventure log therefore samples
`location_id` once a minute and infers "this character finished quest X" from a
location → quest mapping.

## Inference rules (all in `server/src/detect.ts`)

A visit is recorded as a completion when **all** of these hold:

| Rule | Value | Reason |
| --- | --- | --- |
| Minimum dwell | 2 consecutive polls (`MIN_SAMPLES`) | rejects zoning passes and 1-minute bounces |
| Area must be instanced | `/areas` says `is_public === false` **and** `is_wilderness === false` | public hubs and wilderness zones have quest records too |
| Unknown area → deny | absent from `/areas` means no resolution | upstream data gaps must not create false completions |
| Single quest per area | or resolvable by level | multi-quest areas are ambiguous otherwise |
| Level disambiguation | nearest `heroic_normal_cr` at level ≤ 20, `epic_normal_cr` at level ≥ 21; accept only if the runner-up is ≥ 4 levels further | separates heroic/legendary variants (Master Artificer, Lord of Blades, VoD, Hound, Tempest's Spine, Shroud) |
| Newer than stored | `exitAt > last_finished_at` | idempotency; a retried poll cannot double-write |
| Absence is not logout | one omitted id holds the state (`misses`), the second closes the visit | a transient upstream gap would otherwise fabricate a completion and swallow the real exit |

`FORCED_QUEST_AREAS` in `detect.ts` bypasses the wilderness flag for areas upstream
mislabels. Keep it in sync with `AREA_PATCHES` in `src/api/ddoAudit/areas.ts`.
Currently: `Vision of an Alternate History` → `Terror of the Demon Lords`.

### What is deliberately not tracked

- **Difficulty** is invisible in location data, so the log only stores "finished".
  Favor and first-time XP cannot be derived from it.
- Per-attempt history, wipes, and TR-life scoping are not stored.
- Quests shorter than ~2 minutes are missed by design.

## Completion schema (Firestore)

`completions/{character_id}_{quest_id}`

| Field | Meaning |
| --- | --- |
| `finished` | the user-facing checkbox |
| `last_finished_at` | last observed completion; `null` = recorded before tracking began |
| `level_at_finish` | character level at exit (poll path only; `null` for manual edits) |
| `source` | `poll` or `manual` |
| `updated_at` | audit timestamp |

`edits/{autoId}` is append-only: character, quest, finished, timestamps, `writer: null`.

## Edit semantics (the part that is easy to break)

- **Uncheck (wipe/false positive):** `finished = false`, **keep** `last_finished_at`.
  Clearing it lets the next poll re-apply the same visit.
- **Backfill without a date:** `finished = true`, `last_finished_at = null`.
- **Re-check after uncheck:** omit `last_finished_at` so the observed timestamp survives.
  The SPA only sends `null` when the entry has no timestamp at all.
- **Poller writes** bump the timestamp forward and set `finished = true`; that is how a
  genuine later completion re-checks a quest by itself.

## Cadence

- Upstream data: DDO Audit pushes deltas about once a second; the REST snapshot's bulk
  `last_update` advances every ~30 s.
- Poller: **1 minute** (Cloud Scheduler `* * * * *`). Faster buys nothing from the REST
  API and doubles cost; slower starts missing quests.
- `MIN_SAMPLES = 2` at 1/minute is the dwell floor. If the interval changes, rescale it.
- A run is skipped (no upstream request) when the last completed poll is under 45 s old,
  and an in-process flag blocks a second overlapping run (single instance).
- State is saved with a compare-and-swap on `lastPollAt`, so a slow run cannot overwrite
  a newer one; completions are already committed and deduped by timestamp.
- `getCatalog()` logs a warning when a quest area is missing from `/areas` or is flagged
  public — those areas are ignored by design, so the warning is the drift signal.

## Operations

- State lives in `state/poller` (one document): per-character `areaId`, `since`,
  `samples`, `questId`, `lastInsideAt`, `misses`, plus `lastPollAt`.
- `POST /poll` requires the scheduler OIDC token (audience = service URL, email verified).
- `PATCH` requires `X-Log-Password` (Secret Manager, constant-time compare).
- `GET /completions` is public and served from a 15 s in-process cache.
- A run is skipped when the last completed poll is younger than 45 s.

## Files

| File | Purpose |
| --- | --- |
| `server/src/detect.ts` | inference rules (pure, covered by integration tests) |
| `server/src/ddo.ts` | DDO Audit client + catalog cache |
| `server/src/store.ts` | Firestore reads/writes, cache invalidation |
| `server/src/poller.ts` | one poll cycle |
| `server/src/index.ts` | HTTP routes, auth, CORS |
| `src/api/adventureLog/` | browser client |
| `src/pages/AdventureLog.tsx` | the page |
| `terraform-dev/ddo-log/` | Cloud Run + Firestore + Scheduler |
