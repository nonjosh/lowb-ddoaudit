---
name: ddo-gear-planner-data
description: "DDO Gear Planner external data source from illusionistpm/ddo-gear-planner GitHub repo. Items, crafting, and sets JSON files, IndexedDB caching with TTL, data structures for Item, CraftingData, SetsData. Use when modifying gear data fetching, updating cache logic, changing item/crafting/set data structures, or troubleshooting data loading."
---

# DDO Gear Planner Data Source

## When to Use

- Modifying how items, crafting, or sets JSON data is fetched
- Changing the IndexedDB caching layer or TTL
- Updating Item, CraftingData, or SetsData types
- Troubleshooting data loading or stale cache issues
- Adding new data fields from the upstream gear planner

## Data Source

All data comes from the **illusionistpm/ddo-gear-planner** GitHub repository:

```
https://raw.githubusercontent.com/illusionistpm/ddo-gear-planner/refs/heads/master/site/src/assets/
```

| File            | Type           | Purpose                                        |
| --------------- | -------------- | ---------------------------------------------- |
| `items.json`    | `Item[]`       | All equippable items with affixes, slots, sets |
| `crafting.json` | `CraftingData` | Crafting/augment options per slot type         |
| `sets.json`     | `SetsData`     | Set bonuses and thresholds                     |

URLs defined in `src/api/ddoGearPlanner/constants.ts`.

## Caching Layer

**File**: `src/api/ddoGearPlanner/cache.ts`

- **Storage**: Dexie IndexedDB (`gearPlannerDb.datasets`)
- **TTL**: Configurable via `GEAR_PLANNER_CACHE_TTL_MS`
- **Deduplication**: In-flight requests deduplicated (returns same promise)
- **Fallback**: Stale cache served on network errors

## Key Data Structures

### Item

```typescript
interface Item {
  name: string;
  ml: number; // Minimum Level
  slot: string; // Equipment slot name
  type?: string; // Item category (e.g., "Light Weapons")
  affixes: ItemAffix[];
  crafting?: string[]; // Crafting slot type references
  sets?: string[]; // Set membership names
  quests?: string[]; // Drop locations
  url?: string; // Relative wiki path: "/page/ItemName"
  artifact?: boolean; // Minor artifact flag
}

interface ItemAffix {
  name: string; // Property name (e.g., "Strength")
  type: string; // Bonus type (e.g., "Enhancement", "bool")
  value: string | number;
}
```

### Crafting Data

```typescript
// Hierarchical: slot type → item name (or "*" for universal) → options
type CraftingData = Record<string, Record<string, CraftingOption[]>>;

interface CraftingOption {
  name?: string;
  affixes?: ItemAffix[];
  quests?: string[];
  ml?: number;
  set?: string; // Set Augment membership
}
```

### Sets Data

```typescript
type SetsData = Record<string, SetBonus[]>;

interface SetBonus {
  threshold: number; // Items needed to activate
  affixes: ItemAffix[];
}
```

## Wiki URL Field

Items include a `url` field with relative DDO Wiki paths:

- Format: `/page/ItemName` (e.g., `/page/Bracers_of_the_Sun`)
- Converted to full URL via `getWikiUrl()` in `src/utils/affixHelpers.tsx`

## Related Files

| File                                  | Purpose                  |
| ------------------------------------- | ------------------------ |
| `src/api/ddoGearPlanner/constants.ts` | Source URLs, cache TTL   |
| `src/api/ddoGearPlanner/items.ts`     | Item types               |
| `src/api/ddoGearPlanner/crafting.ts`  | Crafting types and fetch |
| `src/api/ddoGearPlanner/sets.ts`      | Set types and fetch      |
| `src/api/ddoGearPlanner/cache.ts`     | IndexedDB caching        |
| `src/api/ddoGearPlanner/index.ts`     | Public exports           |
