# Gear & Affix Stacking Logic

## Overview

DDO gear has **affixes** (properties like "+10 Strength") with **bonus types** (Enhancement, Insight, Quality, etc.). Understanding stacking rules is essential for gear optimization.

## Game Rules (DDO Official)

### Affix Stacking Rules

**Core Rule**: Affixes of the **same property AND same bonus type** do NOT stack. Only the **highest value** applies.

| Scenario                       | Stacks? | Example                                                      |
| ------------------------------ | ------- | ------------------------------------------------------------ |
| Same property, same type       | **NO**  | +10 Strength (Enhancement) + +8 Strength (Enhancement) = +10 |
| Same property, different types | **YES** | +10 Strength (Enhancement) + +5 Strength (Insight) = +15     |
| Different properties           | **YES** | +10 Strength + +10 Constitution = both apply                 |

### Common Bonus Types

| Type        | Description             | Typical Sources      |
| ----------- | ----------------------- | -------------------- |
| Enhancement | Standard bonus          | Most items           |
| Insight     | Stacks with Enhancement | Some items, augments |
| Quality     | Stacks with both        | Rare items           |
| Profane     | Stacks with all         | Very rare            |
| Sacred      | Stacks with all         | Very rare            |
| Exceptional | Older bonus type        | Legacy items         |
| Competence  | Skill bonuses           | Skill items          |
| Equipment   | General equipment       | Base items           |
| Artifact    | Special items           | Artifacts            |

### Boolean vs Numeric Affixes

- **Numeric affixes**: Have a value (e.g., "+10 Strength")
- **Boolean affixes**: Binary on/off (e.g., "Feather Falling")
- Boolean affixes are **ignored** in numerical calculations

## Implementation

### Data Structures

**File**: `src/api/ddoGearPlanner/items.ts`

```typescript
export interface ItemAffix {
  name: string; // Property name (e.g., "Strength")
  type: string; // Bonus type (e.g., "Enhancement", "Insight", "bool")
  value: string | number; // Numeric value or "true" for boolean
}

export interface Item {
  name: string;
  ml: number; // Minimum Level
  slot: string; // Equipment slot
  type?: string; // Item type/category
  affixes: ItemAffix[];
  crafting?: string[]; // Crafting slot types
  sets?: string[]; // Set memberships
  quests?: string[]; // Drop locations
  url?: string; // Wiki URL
  artifact?: boolean; // Is artifact item
}
```

### Affix Combination Algorithm

**File**: `src/domains/gearPlanner/affixStacking.ts`

```typescript
export interface PropertyValue {
  name: string;
  bonuses: Map<string, number>; // bonusType -> value
  total: number; // Sum of all bonus types
}

export function combineAffixes(
  affixes: ItemAffix[],
): Map<string, PropertyValue> {
  const propertyMap = new Map<string, PropertyValue>();

  for (const affix of affixes) {
    // Skip boolean affixes
    if (affix.type === "bool") continue;

    const value =
      typeof affix.value === "string" ? parseFloat(affix.value) : affix.value;

    if (isNaN(value)) continue;

    const propertyName = affix.name;
    const bonusType = affix.type;

    // Get or create property entry
    if (!propertyMap.has(propertyName)) {
      propertyMap.set(propertyName, {
        name: propertyName,
        bonuses: new Map(),
        total: 0,
      });
    }

    const property = propertyMap.get(propertyName)!;
    const currentValue = property.bonuses.get(bonusType) || 0;

    // KEY RULE: Only keep highest value for same bonus type
    if (value > currentValue) {
      property.bonuses.set(bonusType, value);
    }
  }

  // Calculate totals (sum across all bonus types)
  for (const property of propertyMap.values()) {
    property.total = Array.from(property.bonuses.values()).reduce(
      (sum, val) => sum + val,
      0,
    );
  }

  return propertyMap;
}
```

### Gear Slots

**File**: `src/domains/gearPlanner/gearSetup.ts`

```typescript
export const GEAR_SLOTS = [
  "Armor",
  "Belt",
  "Boots",
  "Bracers",
  "Cloak",
  "Gloves",
  "Goggles",
  "Helm",
  "Necklace",
  "Ring", // Can have 2 rings (ring1, ring2)
  "Trinket",
] as const;

export interface GearSetup {
  armor?: Item;
  belt?: Item;
  boots?: Item;
  bracers?: Item;
  cloak?: Item;
  gloves?: Item;
  goggles?: Item;
  helm?: Item;
  necklace?: Item;
  ring1?: Item;
  ring2?: Item;
  trinket?: Item;
}
```

### Getting All Gear Affixes

```typescript
export function getGearAffixes(
  setup: GearSetup,
  setsData: SetsData | null,
  additionalSetMemberships: string[] = [],
): ItemAffix[] {
  const allAffixes: ItemAffix[] = [];
  const setItemCounts = new Map<string, number>();

  // 1. Collect affixes from all equipped items
  const items = [
    setup.armor,
    setup.belt,
    setup.boots,
    setup.bracers,
    setup.cloak,
    setup.gloves,
    setup.goggles,
    setup.helm,
    setup.necklace,
    setup.ring1,
    setup.ring2,
    setup.trinket,
  ];

  for (const item of items) {
    if (item?.sets) {
      for (const setName of item.sets) {
        setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1);
      }
    }
    if (item?.affixes) {
      allAffixes.push(...item.affixes);
    }
  }

  // 2. Add set memberships from crafting (Set Augments)
  for (const setName of additionalSetMemberships) {
    setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1);
  }

  // 3. Add set bonus affixes (if threshold met)
  if (setsData) {
    for (const [setName, count] of setItemCounts.entries()) {
      const setBonuses = setsData[setName];
      if (setBonuses) {
        for (const bonus of setBonuses) {
          if (count >= bonus.threshold) {
            allAffixes.push(...bonus.affixes);
          }
        }
      }
    }
  }

  return allAffixes;
}
```

### Gear Optimization

**File**: `src/domains/gearPlanner/optimization.ts`

```typescript
export interface OptimizationOptions {
  properties: string[]; // Properties to optimize (priority order)
  maxResults?: number; // Max results to return
  minML?: number; // Minimum level filter
  maxML?: number; // Maximum level filter
  craftingData?: CraftingData; // For augment optimization
}

export function calculateScore(
  setup: GearSetup,
  properties: string[],
  setsData: SetsData | null,
  craftingData?: CraftingData,
): {
  score: number;
  propertyValues: Map<string, number>;
  unusedAugments: number;
  totalAugments: number;
  extraProperties: number;
  otherEffects: string[];
  craftingSelections: GearCraftingSelections;
};
```

Score calculation:

1. Get base affixes from all items
2. Auto-select optimal crafting options
3. Combine all affixes with stacking rules
4. Score based on property priority (first = highest weight)

### Optimization Algorithm

The optimizer uses a **greedy algorithm**:

1. Filter items by ML range
2. Score items per slot based on selected properties
3. Include potential crafting contributions in scoring
4. Select top items per slot (keep top 20)
5. Generate base setup with best item per slot
6. Generate alternatives by swapping slots
7. Sort results by: unused augments > extra properties > score

## Related Files

| File                                                                                       | Purpose                 |
| ------------------------------------------------------------------------------------------ | ----------------------- |
| [src/domains/gearPlanner/affixStacking.ts](../../src/domains/gearPlanner/affixStacking.ts) | Affix combination logic |
| [src/domains/gearPlanner/gearSetup.ts](../../src/domains/gearPlanner/gearSetup.ts)         | Gear slots and setup    |
| [src/domains/gearPlanner/optimization.ts](../../src/domains/gearPlanner/optimization.ts)   | Gear optimization       |
| [src/api/ddoGearPlanner/items.ts](../../src/api/ddoGearPlanner/items.ts)                   | Item data types         |

## Changelog

| Date    | Change                 | Reason                                    |
| ------- | ---------------------- | ----------------------------------------- |
| 2024-01 | Initial gear planner   | Support gear optimization                 |
| 2024-03 | Added crafting scoring | Include augment potential in optimization |
