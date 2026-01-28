# Set Bonuses Logic

## Overview

DDO **set bonuses** activate when a character equips multiple items from the same set. Each set has **thresholds** (2-piece, 3-piece, etc.) that unlock additional affixes.

## Game Rules (DDO Official)

### Set Mechanics

1. **Set Membership**: Items can belong to one or more sets (via `sets` property)
2. **Threshold Activation**: Bonuses activate when equipped item count meets threshold
3. **Stacking**: Set bonus affixes follow normal stacking rules
4. **Set Augments**: Some augments provide set membership (count as +1 item toward threshold)

### Common Set Patterns

| Set Type     | Typical Thresholds | Example                |
| ------------ | ------------------ | ---------------------- |
| Named Sets   | 2, 3, 4, 5 pieces  | "Ravenloft Beacon Set" |
| Crafted Sets | 2, 3 pieces        | "Slaver's Set"         |
| Legacy Sets  | Variable           | Old expansion sets     |

## Implementation

### Data Structure

**File**: `src/api/ddoGearPlanner/sets.ts`

```typescript
export interface SetBonus {
  threshold: number; // Minimum items needed
  affixes: ItemAffix[]; // Bonuses granted at this threshold
}

// Structure: SetName -> Array of thresholds with bonuses
export type SetsData = Record<string, SetBonus[]>;

// Example:
// {
//   "Ravenloft Beacon Set": [
//     { threshold: 2, affixes: [...] },
//     { threshold: 3, affixes: [...] },
//     { threshold: 5, affixes: [...] }
//   ]
// }
```

### Counting Set Items

**File**: `src/domains/gearPlanner/gearSetup.ts`

```typescript
// In getGearAffixes():

const setItemCounts = new Map<string, number>();

// 1. Count set items from equipped gear
for (const item of items) {
  if (item?.sets) {
    for (const setName of item.sets) {
      setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1);
    }
  }
}

// 2. Add set memberships from Set Augments
for (const setName of additionalSetMemberships) {
  setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1);
}

// 3. Apply set bonuses where threshold is met
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
```

### Set Augment Handling

**File**: `src/domains/gearPlanner/craftingHelpers.ts`

Set Augments are special crafting options that provide set membership:

```typescript
// Identify Set Augments by the 'set' property
interface CraftingOption {
  name?: string
  affixes?: ItemAffix[]
  set?: string  // ← Set membership granted
}

// Auto-selection prioritizes Set Augments that:
// 1. Grant membership to sets that provide selected properties
// 2. Can reach set threshold with available slots

export function autoSelectCraftingOptionsForGearSetup(...) {
  // Collect Set Augment candidates
  for (const option of validOptions) {
    if (option.set) {
      setAugmentCandidates.push({
        gearSlot: slotKey,
        slotIndex: i,
        slotType,
        option,
        setName: option.set
      })
    }
  }

  // Slot enough to reach threshold if bonus provides selected properties
  for (const [setName, candidates] of setAugmentsBySet.entries()) {
    if (setProvideSelectedProperties(setName, setsData, selectedProperties)) {
      const threshold = getSetMinThreshold(setName, setsData)
      let slotted = 0
      for (const candidate of candidates) {
        if (slotted >= threshold) break
        // Slot the augment
        slotted++
      }
    }
  }
}
```

### Helper Functions

```typescript
// Check if a set bonus provides any selected properties
function setProvideSelectedProperties(
  setName: string,
  setsData: SetsData | null,
  selectedProperties: string[],
): boolean {
  const setBonuses = setsData?.[setName];
  if (!setBonuses) return false;

  for (const bonus of setBonuses) {
    for (const affix of bonus.affixes) {
      if (selectedProperties.includes(affix.name)) {
        return true;
      }
    }
  }
  return false;
}

// Get minimum threshold for a set
function getSetMinThreshold(
  setName: string,
  setsData: SetsData | null,
): number {
  const setBonuses = setsData?.[setName];
  if (!setBonuses || setBonuses.length === 0) return Infinity;

  return Math.min(...setBonuses.map((b) => b.threshold));
}
```

### Extracting Set Memberships from Crafting

```typescript
export function getCraftingSetMemberships(
  selections: SelectedCraftingOption[],
): string[] {
  const sets: string[] = [];

  for (const selection of selections) {
    if (selection.option?.set) {
      sets.push(selection.option.set);
    }
  }

  return sets;
}
```

### Set Bonus Slots

Some items have special crafting slots that let you **choose which set bonus to activate**:

```typescript
const SET_BONUS_SLOT_PATTERNS = [
  "Lost Purpose",
  "Legendary Lost Purpose",
  "Slaver's Set Bonus",
  "Legendary Slaver's Set Bonus",
  "Isle of Dread: Set Bonus Slot",
  "Random set 1",
  "Random set 2",
];

export function isSetBonusSlot(slotType: string): boolean {
  return SET_BONUS_SLOT_PATTERNS.some((pattern) => slotType.includes(pattern));
}
```

For set bonus slots, the best option is selected directly based on which provides the most value for selected properties.

## Data Sources

Set data is fetched from `sets.json`:

```typescript
// src/api/ddoGearPlanner/sets.ts
export async function fetchSets(): Promise<SetsData> {
  const resp = await fetch(SETS_JSON_URL);
  return (await resp.json()) as SetsData;
}
```

## Related Files

| File                                                                                           | Purpose                             |
| ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| [src/api/ddoGearPlanner/sets.ts](../../src/api/ddoGearPlanner/sets.ts)                         | Set data types and fetching         |
| [src/domains/gearPlanner/gearSetup.ts](../../src/domains/gearPlanner/gearSetup.ts)             | Set bonus application in gear setup |
| [src/domains/gearPlanner/craftingHelpers.ts](../../src/domains/gearPlanner/craftingHelpers.ts) | Set Augment handling                |

## Changelog

| Date    | Change                        | Reason                               |
| ------- | ----------------------------- | ------------------------------------ |
| 2024-01 | Initial set bonus support     | Basic threshold-based bonuses        |
| 2024-03 | Added Set Augment support     | Count augments toward set thresholds |
| 2024-03 | Added set bonus slot handling | Support Slaver's/Lost Purpose slots  |
