---
name: ddo-catalyst-crafting
description: "Deep and Abyssal catalyst quest mapping, static wiki-derived variant minimum levels, and quest-loot catalyst row generation. Use when updating catalyst data, catalyst MLs, or catalyst loot rendering."
---

# DDO Catalyst Loot Logic

## When to Use

- Modifying catalyst rows in the quest loot dialog
- Updating which quests drop Deep or Abyssal catalysts
- Refreshing heroic or legendary crafted-item minimum levels from DDO Wiki
- Changing catalyst row naming, linking, sorting, or tier filtering
- Troubleshooting why a quest loot dialog is missing a catalyst row

## Data Source

**Static file**: `src/assets/questCatalysts.json`

**Reference wiki page**: https://ddowiki.com/page/Catalyst_Crafting

The file has two parts:

1. Quest-name keys mapping to catalyst definitions:

```json
{
  "Hideous to Behold": [
    {
      "baseItem": "Mantle of the Worldshaper",
      "heroicVariant": "Dream of the Worldshaper",
      "legendaryVariant": "Legendary Dream of the Worldshaper",
      "catalystType": "Deep",
      "equipmentType": "Cloak",
      "dropSource": "end chest"
    }
  ]
}
```

2. A shared wiki-derived minimum-level map:

```json
{
  "_variantMinimumLevels": {
    "Dream of the Worldshaper": 11,
    "Legendary Dream of the Worldshaper": 35
  }
}
```

This shared map avoids repeating the same ML values on every quest entry.

## Wiki Fetch Constraints

- Direct `curl` or MediaWiki API requests from the dev container often return `403 Forbidden`.
- Reliable refreshes should be done from a browser-origin context, for example via Playwright on an open `ddowiki.com` page.
- The current workflow fetches `https://ddowiki.com/page/Item:{Name}` and parses the visible `Minimum level` field from the returned HTML.

## Runtime Logic

**File**: `src/utils/itemLootHelpers.ts`

### Quest Lookup

- Quest names are normalized with `stripQuestTierSuffix()` and lowercased.
- `_variantMinimumLevels` is excluded from quest lookup and used only as metadata.

### Catalyst Row Generation

- Catalyst rows are synthetic `Item` objects returned by `getCatalystItemsForQuest()`.
- `slot` is set to `Catalyst` so the generic loot table can render them.
- The displayed row name remains tier-specific:
  - heroic request: `Deep Catalyst: Mantle of the Worldshaper`
  - epic or legendary request: `Legendary Deep Catalyst: Mantle of the Worldshaper`

### Minimum Level Rule

- The JSON stores wiki-derived heroic and legendary minimum levels for crafted variants.
- The synthetic catalyst row still computes the **higher** of:
  - heroic crafted-item ML
  - legendary crafted-item ML
- This keeps variant ML metadata available even though the loot table now hides catalyst-row ML values.
- If no variant ML exists, the code falls back to quest-level hints and then the old hardcoded fallback.

### Tier Filtering Rule

- Catalyst tier filtering is based on the catalyst row name (`Legendary ...` or not), **not** the derived ML.
- This avoids a legendary ML value causing a heroic catalyst row to disappear from heroic quest views.

### Links

- Crafted heroic and legendary variant names link to their `Item:` pages on DDO Wiki.
- Catalyst row names link to `https://ddowiki.com/page/Catalyst_Crafting` with a text-fragment target based only on `baseItem`.

## UI Rendering

**Files**:

- `src/components/items/ItemTableRow.tsx`
- `src/components/items/ItemLootTable.tsx`

Current catalyst row behavior:

- ML column is blank for catalyst rows
- Catalyst rows sort before normal loot rows
- Name column links to the Catalyst Crafting page
- Properties column shows only:
  - `Heroic variant`
  - `Legendary variant`
- Search indexing includes catalyst metadata and variant names

## Refresh Workflow

1. Update quest entries in `src/assets/questCatalysts.json` if new catalysts are added.
2. Extract unique `heroicVariant` and `legendaryVariant` item names.
3. Open any DDO Wiki item page in the browser tool.
4. Use browser-context fetches to request each `Item:` page and parse `Minimum level`.
5. Update `_variantMinimumLevels` in `src/assets/questCatalysts.json`.
6. Validate with targeted ESLint and `get_errors` on `src/utils/itemLootHelpers.ts` and affected item-table components.

## Current Data Pattern

- The currently scraped catalyst crafted items follow a consistent pattern:
  - heroic variants: ML 11
  - legendary variants: ML 35
- Even so, refreshes should still fetch every item page instead of assuming the pattern will hold for future updates.

## Related Files

| File                                     | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `src/assets/questCatalysts.json`         | Static quest-to-catalyst mapping and ML metadata |
| `src/utils/itemLootHelpers.ts`           | Catalyst row generation and ML derivation        |
| `src/components/items/ItemTableRow.tsx`  | Catalyst property rendering                      |
| `src/components/items/ItemLootTable.tsx` | Catalyst search/filter participation             |
| `src/utils/affixHelpers.tsx`             | Wiki URL expansion                               |
