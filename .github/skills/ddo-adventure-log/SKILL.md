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

Every collection this app owns is prefixed `ddo_log_` (`COLLECTION_PREFIX` in
`server/src/store.ts`) so the shared default database stays readable. The move happened
on 2026-10-29 (copy, verify, delete) and the one-off script was removed afterwards; the
unprefixed collections are empty.

**Do not roll the Cloud Run image back past that change.** A revision built before it
reads the empty unprefixed collections: the log shows no rows and the poller starts from
an empty state, writing duplicate completions into the orphan collection.

`ddo_log_completions/{character_id}_{quest_id}_{band}` — one document per version, where
`band` is `heroic`, `epic` or `legendary`. A run's version is picked by the nearest
version level (`server/src/bands.ts`), mirroring the resolver, so a level-32 character
in Toven's Workshop writes the legendary row and a level-19 character the heroic one.

Rows written before bands existed were re-keyed by
a one-off script that was removed after it ran.

| Field | Meaning |
| --- | --- |
| `finished` | the user-facing checkbox |
| `history` | completion timestamps, newest first, capped at 10 (`HISTORY_LIMIT`) |
| `last_finished_at` | `history[0]`; `null` = no known completion date (rendered as "no data") |
| `level_at_finish` | character level at exit; a manual edit preserves the existing value and never sets one |
| `source` | `poll` or `manual` |
| `updated_at` | audit timestamp |

Documents written before `history` existed are read as a one-entry history from
`last_finished_at`, so no migration is needed.

### Reincarnation (TR)

A character that drops from level 20+ to 5 or below and then appears in a quest with
heroic CR <= 3 is treated as reincarnated (`server/src/detect.ts`). The poller stores the
event in `ddo_log_reincarnations/{character_id}` and re-derives the checkboxes for that character:
`finished` stays true only when the newest history entry is at or after the TR time
(`resetCompletionsForLife` in `server/src/store.ts`). History is never deleted, so the
previous life stays readable and its entries are tagged "(prev life)" in the tooltip.

- Candidates expire after 24h, a level of 0 or a missing level never triggers one, and a
  recorded TR time never moves backwards.
- Iconic reincarnations (level 15) and Otto's Box leveling are not detectable this way;
  use the manual dialog (`Record a reincarnation`) or
  `POST /reincarnations/{characterId}` with the write password and an optional `at`
  (max 24h in the future).
- The ransack counter only counts loots from the current life.

### Ransack status (derived, not stored)

`src/domains/adventureLog/ransack.ts` counts completions inside a 7-day window:

| Constant | Value |
| --- | --- |
| `QUEST_RANSACK_WINDOW_MS` | 7 days (168 h) |
| `QUEST_RANSACK_LIMIT` | 8 loots per timer period |

The timer starts at the first loot of a period and is **not extended** by later loots;
loots 1-8 inside it are normal and the 9th is the first reduced
(https://ddowiki.com/page/Chest_ransack). The page therefore shows `N/8` from the second
loot, warns "next loot ransacked" at 8, and only shows the "Ransacked" chip from 9 — with
the estimated timer end (period start + 7 days) in the tooltip. `truncated` marks the
case where the stored history hit its 10-entry cap, so the period start may be later
than reality and the tooltip says "Resets by" instead of "Resets".

`getRansackStatus(history)` returns `{ runsInWindow, ransacked }`; the page shows a
"Ransacked" chip at the limit and an "N/5 in 7d" hint above one run. Adjust the two
constants if the game changes; nothing is written for this, so no migration is needed.

`ddo_log_edits/{autoId}` is append-only and written in the same transaction as the
change. It holds the **after** state (`finished`, `last_finished_at`, `history`), `at`,
and `writer: null` (a shared password identifies nobody), plus the **before** state:
`previous_exists`, `previous_finished`, `previous_history`, `previous_level_at_finish`,
`previous_source`.

That pair makes a wrong bulk edit undoable, but the undo must check for drift first: read
the live completion and abort unless its `finished` and `history` still equal the logged
after-state. A poll may have added a completion since, and a blind write would delete it
(the poller never re-adds an old exit time). Refuse the undo as well when the character has
a reincarnation newer than the edit: a TR reset rewrites `finished` without touching
`history`, so restoring `previous_finished` would resurrect a completion from the previous
life. When `previous_exists` is false the undo deletes the document — nothing else in the
server deletes completion docs, so a checked row for a never-played quest would otherwise
stay visible forever.

Entries without a `previous_exists` field predate this feature and are diagnostic only;
test for the field, not a date.

**Never put a Firestore TTL on `ddo_log_edits`.** It is the only undo record and the only
record that a row was touched by hand; the write password is shared and guessable by
design.

## Edit semantics (the part that is easy to break)

- **Uncheck (wipe/false positive):** `finished = false`, **keep** `last_finished_at`.
  Clearing it lets the next poll re-apply the same visit.
- **Backfill without a date:** `finished = true`, `last_finished_at = null` (the page
  renders this as "no data").
- **Re-check after uncheck:** omit `last_finished_at` so the observed timestamp survives.
  The SPA only sends `null` when the entry has no timestamp at all.
- **Poller writes** bump the timestamp forward and set `finished = true`; that is how a
  genuine later completion re-checks a quest by itself.

## Grouping (saga -> pack -> level)

The page shows one row per playable version (a quest with heroic and legendary CRs
gets two rows) and groups them, all collapsed by default and ordered by level
descending. There are three modes, chosen by one Packs / Sagas / Recently done toggle:

- **Packs**: adventure pack only, split into Heroic / Epic / Legendary bands, then
  level for quests with no pack. Sagas are ignored here.
- **Sagas**: saga groups only; a quest appears in every saga it belongs to
  (`src/data/questGroupings.json`), and rows whose version does not match a
  "(Heroic)"/"(Legendary)" saga are dropped from this view.
- **Recently done**: no grouping. Completed rows that have a completion date, newest
  first, with the adventure pack as dim caption text after the quest name instead of a
  pack header. Rows ticked by hand without a date are left out — they have no last-done
  date to show. Search matches single rows here instead of whole groups, hidden packs
  still apply, and "Hide completed" is disabled because every row is already completed.
  The ±level cut keeps completed rows, so an old run does not disappear.

"Hide completed" removes a group only when **every** quest in it is done; a partially
finished group keeps its full list. The Type column is gone — a `Solo`/`Raid`/other badge
appears next to the quest name when it is not a `Party` quest. The search input is
deferred (`useDeferredValue`) so typing stays responsive while groups recompute.

Group headers carry a tri-state checkbox (all / some / none done) that marks every row
in the group, the level range, and a done/total count; a group whose every row is done
is struck through. Totals include rows hidden by the level cut below, so a group cannot
look complete while its hidden rows are unfinished. Inside a group, raid quests sort
last; the search box matches quest names, adventure packs and favor factions, and
highlights the match in the name and favor columns.

Search works on **groups**, not rows: a group is kept when any of its rows matches, and
then all of its rows are listed with the group header, expanded, so the pack can be read
in context. The level cut is skipped while searching and the list says when nothing
matches (`No quest, pack or favor matches "…"`).

Saga groups also show a chip per Deck of Many Curses card type the saga awards, from
`src/data/sagaCards.json` (generated by `scripts/build-saga-cards.ts`). The Favor filter
sits in the table header (funnel icon, multi-select popover, empty set = all) rather than
in the filter row, and the Inside chip lists player names with the characters, levels and
class icons in its tooltip.

Groups start **collapsed**. The only automatic expansion is for groups that contain a
character currently inside a quest (`GET /activity`); there is no level-based
auto-expand or scrolling.

### Level cut

`OFF_LEVEL_RANGE = 6` in `src/pages/AdventureLog.tsx`, on by default and toggled by the
"±6 levels" button: rows whose level is more than 6 away from the selected character are
hidden. A row stays visible when the character already cleared that version or when any
tracked character is inside it. The cut is skipped while the search box has text, so a
search is never silently filtered. Raid rows get a Raid badge, and
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

- State lives in `ddo_log_state/poller` (one document): per-character `areaId`, `since`,
  `samples`, `questId`, `lastInsideAt`, `misses`, plus `lastPollAt`.
- `POST /poll` requires the scheduler OIDC token (audience = service URL, email verified).
- `PATCH` requires `X-Log-Password` (Secret Manager, constant-time compare).
- `GET /completions` is public and served from a 15 s in-process cache.
- `GET /activity` is public and exposes `ddo_log_state/poller` (area, quest, since) so the page
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
