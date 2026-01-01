# Copilot Instructions for lowb-ddoaudit

## Project Overview

This is a React TypeScript web app using Vite for DDO (Dungeons & Dragons Online) raid auditing. It groups raid timers by raid name instead of character name, integrating with DDO Audit API.

## Architecture

- **Main App**: `src/App.tsx` orchestrates data fetching and state management.
- **Components**: Organized in `src/components/` by feature (characters/, raids/, lfm/). Use Material-UI (@mui) for UI.
- **API Layer**: `src/api/ddoAudit/` handles external API calls (e.g., `fetchRaidActivity`, `fetchCharactersByIds`).
- **Business Logic**: `src/domains/` contains domain-specific functions (e.g., `raidLogic.ts` for raid grouping).
- **State Management**: React contexts in `src/contexts/` (e.g., `CharacterContext` for shared character data).
- **Configuration**: `src/config/characters.ts` defines `CHARACTERS_BY_PLAYER` mapping character IDs to players.

## Key Patterns

- **Data Flow**: Fetch data in `App.tsx`, process in domains, pass via props/contexts to components.
- **Character Mapping**: Use `getPlayerName()` from `raidLogic.ts` to map character names to players via `CHARACTERS`.
- **Raid Grouping**: `buildRaidGroups()` in `raidLogic.ts` groups entries by quest, prioritizing raids with expected players or LFMs.
- **Component Props**: Define interfaces for props (e.g., `RaidTimerSectionProps`).
- **Styling**: Use Material-UI components with Emotion styling.

## Workflows

- **Development**: `npm run dev` starts Vite dev server (listens on all interfaces for dev containers).
- **Build**: `npm run build` for production (sets base path for GitHub Pages).
- **Linting**: `npm run lint` uses ESLint with React hooks and refresh plugins.
- **Preview**: `npm run preview` serves built app.

## External Dependencies

- **DDO Audit API**: Endpoints like `https://api.ddoaudit.com/v1/activity/raids` for raid data.
- **Static Data**: Quests/areas from GitHub raw URLs (e.g., `quests.json`).
- **Libraries**: React 19, Material-UI 7, Vite with custom rollup.

## Conventions

- **File Naming**: PascalCase for components (e.g., `RaidCard.tsx`), camelCase for utilities.
- **Imports**: Group external libs, then internal (api/, components/, etc.).
- **Error Handling**: Use try/catch in async fetches, set error states.
- **State Updates**: Use `useMemo` for computed values like `raidGroups`.
- **Config Updates**: Edit `CHARACTERS_BY_PLAYER` to add/remove characters; rebuild required.

## Examples

- Adding a new raid filter: Modify `tierFilter` state in `RaidTimerSection.tsx` and update `isLevelInTier()` in `raidLogic.ts`.
- Fetching new data: Add to `App.tsx` useEffect, export from `api/ddoAudit/index.ts`.</content>
  <parameter name="filePath">/workspaces/lowb-ddoaudit/.github/copilot-instructions.md
