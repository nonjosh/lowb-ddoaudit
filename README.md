# This is a Web Application integrating DDO Audit for our friends in Shadowdale

Live site (GitHub Pages):

- https://nonjosh.github.io/lowb-ddoaudit/

Currently DDO Audit will only group the raid timers by character name. This web application will allow the timer to be grouped by raid name instead.

## Features

- **Characters Section**: Displays raid timers grouped by character, showing recent raid activity and quest completions.
- **Raids Section**: Groups raid timers by quest/raid name, providing a consolidated view of raid progress across all characters.
- **LFM Section**: Shows active "Looking for More" posts from the Shadowdale server to find raid groups.
- **Item Loot Dialogs**: For each quest, displays possible loot items with filters, crafting options, and set bonuses.

## Running locally

- Install deps: `npm install`
- Start dev server: `npm run dev`

If you're running in a dev container / Codespaces and can't open the site in your browser,
make sure Vite is listening on all interfaces (this repo is configured to do that by default)
and then open the forwarded port from VS Code.

## Related APIs

- **DDO Audit**:

  - **APIs**:
    - Raid activity: `https://api.ddoaudit.com/v1/activity/raids`
    - Character details: `https://api.ddoaudit.com/v1/characters/ids/{ids}`
    - LFM posts: `https://api.ddoaudit.com/v1/lfms/shadowdale`
    - Server health: `https://api.ddoaudit.com/v1/game/server-info`
  - **GitHub Data**:
    - Quests: `https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/quests.json`
    - Areas: `https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/areas.json`

- **DDO Gear Planner**:
  - **GitHub Data**:
    - Items: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/site/src/assets/items.json`
    - Crafting: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/site/src/assets/crafting.json`
    - Sets: `https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/site/src/assets/sets.json`

## Known Issues

- The "Nearly Finished" label in the augments/crafting column has hover text disabled due to a bug.
