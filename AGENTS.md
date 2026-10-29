# AGENTS.md - AI Coding Agent Instructions

This file provides instructions for AI coding agents (GitHub Copilot, OpenAI Codex, Claude, etc.) working with this codebase.

## Project Summary

**lowb-ddoaudit** is a React TypeScript web application using Vite for DDO (Dungeons & Dragons Online) raid auditing. It integrates with the DDO Audit API to group raid timers by raid name instead of character name, serving players on the Shadowdale server.

**Live Site**: https://nonjosh.github.io/lowb-ddoaudit/

## Critical Rules

1. **Do NOT start dev server manually** - The devcontainer automatically runs `npm run dev`. Manual starts cause port conflicts.
2. **Organize imports** - After editing files, organize imports (external libraries first, then internal modules alphabetically).
3. **Run linting** - After substantive changes, run `npm run lint` to catch errors.
4. **Clean formatting** - Remove trailing whitespace from all lines; ensure files end with a single newline.
5. **ALWAYS verify build output** - After running `npm run build` or `npm run lint`, YOU MUST check the exit code and read the actual error messages. DO NOT report success if there are build errors, TypeScript errors, or ESLint warnings. If the build fails, fix ALL errors before proceeding.
6. **Maintain Documentation** - If you add new directories, major features, or change the project structure, YOU MUST update this `AGENTS.md` file to reflect those changes immediately.
7. **Update Game Logic Skills** - When modifying DDO game mechanics (raid timers, XP calculation, gear/affix logic, augments, sets, crafting, weapons), YOU MUST update the corresponding skill in `.github/skills/ddo-*/`. See [Game Logic Skills](#game-logic-skills) below.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite (rolldown-vite)
- **UI Library**: Material-UI 7 (@mui/material)
- **Styling**: Emotion (@emotion/react, @emotion/styled)
- **Routing**: React Router DOM 7
- **Storage**: Dexie (IndexedDB wrapper)
- **Linting**: ESLint 9 with TypeScript and React plugins

## Project Structure

```
server/                  # Adventure log API (Cloud Run, Firestore) - Node/TypeScript, own package.json
src/
├── App.tsx              # Main app - orchestrates data fetching and state
├── api/                 # External API integrations
│   ├── ddoAudit/        # DDO Audit API (raids, characters, LFMs)
│   └── ddoGearPlanner/  # DDO Gear Planner data (items, crafting, sets)
├── components/          # UI components organized by feature
│   ├── characters/      # Character display components
│   ├── gearPlanner/     # Gear planning UI
│   ├── items/           # Item/loot display components
│   ├── layout/          # Layout wrapper
│   ├── lfm/             # LFM (Looking for More) components
│   ├── raids/           # Raid timer components
│   └── shared/          # Reusable shared components
├── config/              # Configuration (character mappings)
├── contexts/            # React contexts for state management
├── data/                # Static data files
│   ├── lowb.json        # Player name -> character names mapping
│   └── character_ids.csv # Character name -> ID mapping
├── domains/             # Business logic by domain
│   ├── characters/      # Character grouping logic
│   ├── gearPlanner/     # Gear optimization logic
│   ├── lfm/             # LFM helper functions
│   ├── quests/          # Quest helper functions
│   └── raids/           # Raid grouping and timer logic
├── hooks/               # Custom React hooks
├── pages/               # Page-level components
├── storage/             # IndexedDB storage (Dexie)
├── styles/              # Theme configuration
└── utils/               # Utility functions

.github/
├── copilot-instructions.md  # Workspace instructions for Copilot
└── skills/                  # DDO game logic skills (MUST be kept updated)
    ├── ddo-raids/           # Raid lockout timers
    ├── ddo-gear-affixes/    # Gear and affix stacking
    ├── ddo-augments-crafting/ # Augments and crafting slots
   ├── ddo-catalyst-crafting/ # Catalyst loot mapping and variant ML refresh
    ├── ddo-set-bonuses/     # Set item bonuses
    ├── ddo-ransack/         # Chest ransack timers
    ├── ddo-green-steel/     # Green Steel crafting
    ├── ddo-legendary-green-steel/ # Legendary Green Steel crafting
    ├── ddo-viktranium-crafting/   # Viktranium crafting
    ├── ddo-weapon-styles/   # Weapon fighting styles
    ├── ddo-trove-data/      # Trove inventory data format
    ├── ddo-audit-api/       # DDO Audit REST API integration
    ├── ddo-gear-planner-data/ # DDO Gear Planner data source
   └── ddo-wiki/            # DDO Wiki URL patterns and linking
```

## Key Patterns

### Import Conventions

- Use `@/` for absolute imports from `src/` (e.g., `@/api/ddoAudit`, `@/components/shared`)
- Use relative imports within the same component directory (e.g., `./RaidCard`)
- Order: external libraries → internal modules (alphabetically by path)

### Data Flow

1. Fetch data in `App.tsx` or page components
2. Process with domain logic functions (e.g., `buildRaidGroups()` in `raidLogic.ts`)
3. Pass via props or React contexts to child components

### Component Conventions

- **File naming**: PascalCase for components (`RaidCard.tsx`), camelCase for utilities (`raidLogic.ts`)
- **Props**: Define TypeScript interfaces for all component props
- **Computed values**: Use `useMemo` for derived state
- **Responsive Layout**: For horizontal arrays of controls or filters, use MUI `<Stack direction="row" useFlexGap flexWrap="wrap">` instead of strict `<Stack direction={{ xs: 'column', md: 'row' }}>` to prevent layout breaks and horizontally overflowing items on vertical or intermediate width displays.
- **Item level cap**: Item-level selectors and exported gear-planner URLs must use `ITEM_MAX_LEVEL` from `src/api/ddoGearPlanner/constants.ts` instead of hardcoded values. The current cap is 36; when lv40 gear arrives, update that constant first and then audit any remaining explicit level bins or documentation.

### Date Display

- **Non-relative dates** use `yyyy-mm-dd (EEE)` — `2026-10-29 (Thu)`. A date with a time is `2026-10-29 (Thu) 09:46`, adding `:05` only where seconds matter.
- Always render dates through `formatLocalDate` / `formatLocalDateTime` in `src/api/ddoAudit/helpers.ts`; never `toLocaleDateString`/`toLocaleString` on a `Date`, whose output changes with the browser locale.
- **Relative text stays relative**: "just now", "3h ago", "in 2d", the raid lockout countdown. Those are a different reading task and are not covered by the format above.

### Error Handling

- Wrap async operations in try/catch
- Set error states for UI feedback
- Use TypeScript strict mode

## Commands

| Command           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `npm install`     | Install dependencies                            |
| `npm run dev`     | Start dev server (auto-started in devcontainer) |
| `npm run build`   | Build for production (GitHub Pages)             |
| `npm run lint`    | Run TypeScript check + ESLint                   |
| `npm run preview` | Preview production build                        |

## External APIs

### DDO Audit API

- Raid activity: `https://api.ddoaudit.com/v1/activity/raids`
- Characters by IDs: `https://api.ddoaudit.com/v1/characters/ids/{ids}`
- Characters by server: `https://api.ddoaudit.com/v1/characters/{serverName}`
- Guild characters: `https://api.ddoaudit.com/v1/characters/by-server-and-guild-name/{server}/{guild}`
- LFM posts: `https://api.ddoaudit.com/v1/lfms/{serverName}`
- Server info: `https://api.ddoaudit.com/v1/game/server-info`
- Quests (API): `https://api.ddoaudit.com/v1/quests?force=false`
- Areas (API): `https://api.ddoaudit.com/v1/areas?force=false`

### Metadata Cache

- Quest and area responses are fetched from DDO Audit at runtime, cached client-side for 24 hours, and can fall back to stale cached data if the network request fails.

### Quests or areas missing from DDO Audit

When a new quest/raid is not yet in the DDO Audit API (or upstream data is wrong), add temporary client-side data, then remove it once upstream catches up:

1. **Quest missing from `/v1/quests`** → add a fallback entry to `HARDCODED_QUESTS` in `src/api/ddoAudit/quests.ts` (API data overrides it once available).
2. **Raid timer shows "temporarily not available"** → add the quest id to `PENDING_RAID_IDS` in `src/api/ddoAudit/constants.ts`.
3. **Area missing from `/v1/areas`** → add a fallback entry to `HARDCODED_AREAS` in `src/api/ddoAudit/areas.ts`.
4. **Upstream area record is wrong** (e.g., a raid's area mislabeled as wilderness, which breaks Character panel grouping) → add an override to `AREA_PATCHES` in `src/api/ddoAudit/areas.ts`.

Remove the entries as soon as the API provides correct data. Example: `Terror of the Demon Lords` (quest `1879303683`, area `1879303679`) was hardcoded on 2026-09 and cleaned up once upstream added it; its area remained patched (`is_wilderness: false`) because upstream mislabels it as wilderness `Vision of an Alternate History`.

### DDO Gear Planner (GitHub Raw)

- Items: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/data/items.json`
- Crafting: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/data/crafting.json`
- Sets: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/data/sets.json`
- Items/Crafting/Sets: from ddo-gear-planner

## Routes

| Path               | Page         | Description                 |
| ------------------ | ------------ | --------------------------- |
| `/`                | Dashboard    | Raid timers & loot tracking |
| `/adventure-log`   | Adventure Log | Quest completions per character (editable) |
| `/gear/wiki`       | Wiki         | Browse/search all items     |
| `/gear/wishlist`   | Wishlist     | Track desired items         |
| `/gear/planner`    | Gear Planner | Optimize gear sets          |
| `/trove/explorer`  | Trove Explorer | Browse imported shared bank, personal bank, and inventory snapshots |
| `/tools/converter` | Converter    | Convert Points, Shards, HKD |

**Note**: Old routes (`/wiki`, `/wishlist`, `/planner`) redirect to new paths for backward compatibility.

## Adventure Log Backend (`server/`)

A separate Node/TypeScript package that serves the adventure log. It is **not** part of
the Vite build and is deployed to Cloud Run; the SPA calls it with `fetch`.

| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `GET /completions` | public | all recorded completions keyed `questId:band`, 15 s in-process cache |
| `GET /activity` | public | where the poller last saw each tracked character |
| `PATCH /completions/{characterId}/{questId}/{band}` | `X-Log-Password` header | uncheck / backfill one version |
| `POST /poll` | Cloud Scheduler OIDC | one poll cycle, run every minute |

Commands (from `server/`):

| Command | Description |
| ------- | ----------- |
| `npm install` | install server dependencies (separate from the SPA) |
| `npm run build` | compile to `dist/` |
| `npm run test:integration` | live DDO Audit mapping assertions (no mocks) |
| `npm run test:e2e` | against the deployed service; needs `BASE_URL`, `LOG_PASSWORD`, `TEST_CHARACTER_ID`, `TEST_QUEST_ID` |
| `npx tsx scripts/update-sagas.ts` | refresh `src/data/sagas.json` from the DDO Wiki (via the reader proxy) |
| `npx tsx scripts/build-quest-groupings.ts` | regenerate `src/data/questGroupings.json` (quest -> saga/pack cache) |
| `npx tsx scripts/build-saga-cards.ts` | refresh `src/data/sagaCards.json` (Deck of Many Curses card per saga) |

Infrastructure lives in the sibling Terraform repo: `terraform-dev/ddo-log/`
(Cloud Run + Firestore + Cloud Scheduler). See its README for the two-phase deploy and
how to read the write password from Secret Manager.

Rules that matter when editing this area:

- `src/data/character_ids.csv` is the source of the tracked character list; the
  `tracked_character_ids` Terraform variable must be regenerated when an alt is added
  (see `terraform-dev/ddo-log/README.md`).
- Never commit the write password, and never log it. It only exists in Secret Manager.
- Inference rules are documented in `.github/skills/ddo-adventure-log/SKILL.md`; update
  that skill when changing `server/src/detect.ts`.
- Quest -> saga / adventure pack grouping is cached in `src/data/questGroupings.json`;
  regenerate it with `npx tsx scripts/build-quest-groupings.ts` after adding a saga or
  a pack.

## Review Checklist (traps that already shipped a bug)

Each line below fixed a real defect found after the code looked done. Check them before
calling a change finished.

### Server / Cloud Run (`server/`)

- **CORS lists every method the browser sends.** `Access-Control-Allow-Methods` must
  include `GET, POST, PATCH, OPTIONS`. A missing `POST` broke an endpoint that all the
  server-side tests passed.
- **Public endpoints bill and starve.** Cache the serialized JSON body (not just the
  object) and single-flight the load; a full collection scan or re-serialize per request
  can starve the single instance and the minute poller.
- **Every upstream `fetch` needs `AbortSignal.timeout`.** A hung third-party call holds
  the poller past the scheduler deadline and loses the state write.
- **One omitted character is not a logout.** Hold poller state for one sample, close the
  visit on the second, or a transient gap fabricates a completion.
- **Writes must be monotonic.** Reset/reincarnation/band timestamps never move backwards;
  return the effective time and use it for the derived writes.
- **Reject absurd input.** No future timestamps (>24h), no level `0`/unknown in a TR
  heuristic, bounded bulk payloads (100 rows).
- **Firestore:** `deletion_policy = "RETAIN"` + `prevent_destroy`, collections prefixed
  `ddo_log_` (`COLLECTION_PREFIX`), one transaction per bulk edit (<=500 writes, dedupe
  duplicate doc ids first).
- **Secrets** never reach logs or responses; the write password lives in Secret Manager
  and is compared timing-safe.

### Data snapshots (`src/data`)

- Generate with a script, commit the JSON, never fetch the wiki at runtime.
- Resolve third-party names in three steps — exact, normalized (case, articles,
  punctuation), then a leading `Return to ` removed — and only accept a step when it has
  **exactly one** candidate. Print unresolved and ambiguous names; never guess.
- Cross-check a count the source states and fail loudly when the page layout changes
  (the saga cards feature silently matched 0 of 31 sagas because keys were not
  normalized).

### UI (MUI 7, `src/pages/AdventureLog.tsx`)

- Fixed table layout needs explicit column widths **and** a `minWidth` floor, otherwise
  the auto column collapses and text paints over neighbours.
- `Stack spacing` writes child margins with higher specificity than `sx`: add
  `useFlexGap` when a child needs `ml: 'auto'`.
- Group/aggregate counts must come from the **pre-filter** set, or a filtered group looks
  complete and strikes through.
- Search is client-side: `useDeferredValue` plus one grouping pass; never re-group per
  keystroke.
- Popover filters need labelled, focusable controls (`FormControlLabel` + `Checkbox`),
  not `MenuItem` + `tabIndex={-1}`, and the trigger needs `aria-haspopup`/`aria-expanded`.
- `Chip` labels stay inline (`Stack component="span"`).
- Destructive actions (TR reset, bulk uncheck) need a confirmation that previews the
  effect; TR reset uses two steps.

### Tests and deploys

- e2e hits the live service and **mutates Firestore**: skip mutating cases when the row
  already holds history, and delete test rows afterwards.
- Destructive logic (reset, migration) is verified with a synthetic-id script
  (`server/scripts/check-reincarnation-reset.mjs`), never a real character.
- One-off migration scripts get `--dry-run`, a backup written **before** any delete, and
  are deleted once they have run.
- Deploy = build a new image tag, `terraform apply -var image=...` in
  `terraform-dev/ddo-log`, then verify the Actions run and the served bundle. Pause the
  scheduler for data moves.

## Common Tasks

### Adding a New Component

1. Create file in appropriate `src/components/` subdirectory
2. Define props interface
3. Use Material-UI components for consistency
4. Export from component index if needed

### Adding API Integration

1. Add fetch function in `src/api/ddoAudit/` or appropriate module
2. Export from `index.ts`
3. Call from `App.tsx` or page component
4. Handle loading/error states

### Modifying Character Configuration

Character data is split into two files for easier maintenance:

1. **`src/data/lowb.json`**: Player name → character names mapping
   - Edit this file to add/remove characters for a player
   - The key IS the display name (e.g., `"老mic"` not `"OldMic"`)

2. **`src/data/character_ids.csv`**: Character name → ID mapping
   - After editing `lowb.json`, run: `npx tsx scripts/update-character-ids.ts`
   - This fetches new character IDs from the DDO Audit API

The `src/config/characters.ts` file loads these data files and generates the runtime mappings.

### Adding Business Logic

Add to appropriate domain in `src/domains/` (e.g., raid logic → `raids/raidLogic.ts`).

## Testing Changes

1. Check for TypeScript errors: `npm run lint`
2. Verify in browser (dev server auto-refreshes)
3. Test production build: `npm run build && npm run preview`

## Notes for Agents

- This project uses React 19 features
- Material-UI 7 has breaking changes from v5/v6 - use v7 patterns
- The app is deployed to GitHub Pages with a base path
- Vite config uses rolldown-vite override for faster builds
- The build script generates `404.html` for GitHub Pages SPA routing support

## Game Logic Skills

**Location**: `.github/skills/ddo-*/`

DDO game mechanics are documented as Copilot agent skills that are automatically loaded on-demand when relevant. **You MUST update these skills when modifying game logic.**

| Skill                       | Covers                                                  | Key Source Files                             |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `ddo-raids`                 | Raid lockouts (66h), tier filtering, character grouping | `src/domains/raids/raidLogic.ts`             |
| `ddo-gear-affixes`          | Affix stacking rules, gear evaluation                   | `src/domains/gearPlanner/affixStacking.ts`   |
| `ddo-augments-crafting`     | Augment slots, crafting options, color compatibility    | `src/domains/gearPlanner/craftingHelpers.ts` |
| `ddo-catalyst-crafting`     | Deep/Abyssal catalyst loot mapping, wiki ML refresh, quest-loot ML derivation | `src/utils/itemLootHelpers.ts`, `src/assets/questCatalysts.json` |
| `ddo-set-bonuses`           | Set thresholds, Set Augments                            | `src/api/ddoGearPlanner/sets.ts`             |
| `ddo-ransack`               | Chest ransack timers (168h)                             | `src/storage/ransackDb.ts`                   |
| `ddo-green-steel`           | Heroic Green Steel crafting                             | `src/domains/crafting/greenSteelLogic.ts`    |
| `ddo-legendary-green-steel` | Legendary Green Steel crafting, raw ingredients         | `src/domains/crafting/lgsLogic.ts`           |
| `ddo-viktranium-crafting`   | Viktranium augment crafting (U75)                       | `src/domains/crafting/viktraniumLogic.ts`    |
| `ddo-weapon-styles`         | Fighting styles, weapon combinations                    | `src/domains/gearPlanner/gearSetup.ts`       |
| `ddo-trove-data`            | Trove inventory data format, item matching              | `src/api/trove/`                             |
| `ddo-audit-api`             | DDO Audit REST API endpoints, data types                | `src/api/ddoAudit/`                          |
| `ddo-adventure-log`         | Completion inference, poller rules, Firestore schema    | `server/`, `src/pages/AdventureLog.tsx`      |
| `ddo-gear-planner-data`     | Gear Planner JSON data source, caching                  | `src/api/ddoGearPlanner/`                    |
| `ddo-wiki`                  | DDO Wiki URL patterns, linking conventions              | `src/components/shared/DdoWikiLink.tsx`      |

### When to Update Game Logic Skills

Update the corresponding skill when you:

1. **Change constants** (e.g., timer durations, XP values, level thresholds)
2. **Modify calculation formulas** (e.g., XP bonuses, affix stacking)
3. **Add new game mechanics** (e.g., new augment types, new set patterns)
4. **Fix bugs** in existing game logic
5. **Add new data sources** that affect game calculations

### Key Constants Reference

| Constant          | Value              | Location                                     |
| ----------------- | ------------------ | -------------------------------------------- |
| `ITEM_MAX_LEVEL`  | 36 (plan for 40)   | `src/api/ddoGearPlanner/constants.ts`        |
| `RAID_LOCKOUT_MS` | 66 hours (2d 18h)  | `src/api/ddoAudit/constants.ts`              |
| Ransack Duration  | 168 hours (7 days) | `src/storage/ransackDb.ts`                   |
| Poller interval   | 60 s (2 samples min) | `terraform-dev/ddo-log` + `server/src/config.ts` |
| Completion history | last 10 per character+quest | `server/src/store.ts` (`HISTORY_LIMIT`) |
| Quest ransack     | 7 days / 5 runs    | `src/domains/adventureLog/ransack.ts` |
