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

`completions/{character_id}_{quest_id}_{band}` — one document per version, where
`band` is `heroic`, `epic` or `legendary`. A run's version is picked by the nearest
version level (`server/src/bands.ts`), mirroring the resolver, so a level-32 character
in Toven's Workshop writes the legendary row and a level-19 character the heroic one.

Rows written before bands existed were re-keyed by
`server/scripts/migrate-bands.mjs` (dry run supported, JSON backup written first).

| Field | Meaning |
| --- | --- |
| `finished` | the user-facing checkbox |
| `history` | completion timestamps, newest first, capped at 10 (`HISTORY_LIMIT`) |
| `last_finished_at` | `history[0]`; `null` = recorded before tracking began |
| `level_at_finish` | character level at exit (poll path only; `null` for manual edits) |
| `source` | `poll` or `manual` |
| `updated_at` | audit timestamp |

Documents written before `history` existed are read as a one-entry history from
`last_finished_at`, so no migration is needed.

### Ransack status (derived, not stored)

`src/domains/adventureLog/ransack.ts` counts completions inside a 7-day window:

| Constant | Value |
| --- | --- |
| `QUEST_RANSACK_WINDOW_MS` | 7 days |
| `QUEST_RANSACK_LIMIT` | 5 runs |

`getRansackStatus(history)` returns `{ runsInWindow, ransacked }`; the page shows a
"Ransacked" chip at the limit and an "N/5 in 7d" hint above one run. Adjust the two
constants if the game changes; nothing is written for this, so no migration is needed.

`edits/{autoId}` is append-only: character, quest, finished, timestamps, `writer: null`.

## Edit semantics (the part that is easy to break)

- **Uncheck (wipe/false positive):** `finished = false`, **keep** `last_finished_at`.
  Clearing it lets the next poll re-apply the same visit.
- **Backfill without a date:** `finished = true`, `last_finished_at = null`.
- **Re-check after uncheck:** omit `last_finished_at` so the observed timestamp survives.
  The SPA only sends `null` when the entry has no timestamp at all.
- **Poller writes** bump the timestamp forward and set `finished = true`; that is how a
  genuine later completion re-checks a quest by itself.

## Grouping (saga -> pack -> level)

The page shows one row per playable version (a quest with heroic and legendary CRs
gets two rows) and groups them, all collapsed by default and ordered by level
descending. There are two modes:

- **Default**: adventure pack only, split into Heroic / Epic / Legendary bands, then
  level for quests with no pack. Sagas are ignored here.
- **"Sagas only"**: saga groups only; a quest appears in every saga it belongs to
  (`src/data/questGroupings.json`), and rows whose version does not match a
  "(Heroic)"/"(Legendary)" saga are dropped from this view.

Group headers carry a tri-state checkbox (all / some / none done) that marks every row
in the group, the level range, and a done/total count. Inside a group, raid quests sort
last; the search box matches quest names, adventure packs and favor factions, and
highlights the match in the name and favor columns. Raid rows get a Raid badge, and
a row shows an "N inside" badge when tracked characters are currently in that quest
(`GET /activity`).

`src/data/questGroupings.json` is a snapshot of quest id -> `{ sagas, pack }`, built by
`scripts/build-quest-groupings.ts` from `src/data/sagas.json` plus the DDO Audit quest
list. Re-run `npx tsx scripts/build-quest-groupings.ts` after adding a saga or a pack.
A quest can belong to several sagas (heroic/legendary variants, and event sagas that
share quests), so the cache stores every membership. The normal view shows a quest in
its first saga; the "Sagas only" toggle shows it in all of them. Grouping prefers the
snapshot and falls back to the live `required_adventure_pack` field for quests released
after it was generated.

Hidden adventure packs are a browser preference (`localStorage`,
`lowb-adventure-log-hidden-packs`) and filter quests out of every group.

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
- `GET /activity` is public and exposes `state/poller` (area, quest, since) so the page
  can show who is inside a quest and focus that group on load.
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
