# AGENTS.md - AI Coding Agent Instructions

This file provides instructions for AI coding agents (GitHub Copilot, OpenAI Codex, Claude, etc.) working with this codebase.

## Project Summary

**lowb-ddoaudit** is a React TypeScript web application using Vite for DDO (Dungeons & Dragons Online) raid auditing. It integrates with the DDO Audit API to group raid timers by raid name instead of character name, serving players on the Shadowdale server.

**Live Site**: https://nonjosh.github.io/lowb-ddoaudit/

## Critical Rules

1. **Do NOT start dev server manually** - The devcontainer automatically runs `npm run dev`. Manual starts cause port conflicts.
2. **Organize imports** - After editing files, organize imports (external libraries first, then internal modules alphabetically).
3. **Run linting** - After substantive changes, run `npm run lint` to catch errors.
4. **Clean formatting** - Remove trailing whitespace; ensure files end with a single newline.
5. **Maintain Documentation** - If you add new directories, major features, or change the project structure, YOU MUST update this `AGENTS.md` file to reflect those changes immediately.

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
- Characters: `https://api.ddoaudit.com/v1/characters/ids/{ids}`
- LFM posts: `https://api.ddoaudit.com/v1/lfms/shadowdale`
- Server info: `https://api.ddoaudit.com/v1/game/server-info`

### Static Data (GitHub Raw)

- Quests: `quests.json` from ddo-audit-service
- Areas: `areas.json` from ddo-audit-service
- Items/Crafting/Sets: from ddo-gear-planner

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
