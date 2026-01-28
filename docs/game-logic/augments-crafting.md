# Augments & Crafting Logic

## Overview

DDO items can have **crafting slots** that allow players to add augments or select affixes. This codebase supports augment slots, set bonus slots, and affix selection slots.

## Game Rules (DDO Official)

### Augment Types (9 Colors)

| Color     | Slot Name              | Gem Name    |
| --------- | ---------------------- | ----------- |
| Blue      | Blue Augment Slot      | Sapphire    |
| Red       | Red Augment Slot       | Ruby        |
| Yellow    | Yellow Augment Slot    | Topaz       |
| Green     | Green Augment Slot     | Emerald     |
| Purple    | Purple Augment Slot    | Amethyst    |
| Orange    | Orange Augment Slot    | Citrine     |
| Colorless | Colorless Augment Slot | Diamond     |
| Moon      | Moon Augment Slot      | (Moon gems) |
| Sun       | Sun Augment Slot       | (Sun gems)  |

### Augment Slot Compatibility

**Core Rule**: Some augments can fit in multiple slot colors.

| Augment Color | Compatible Slots                         |
| ------------- | ---------------------------------------- |
| Blue          | Blue, Green, Purple                      |
| Red           | Red, Purple, Orange                      |
| Yellow        | Yellow, Green, Orange                    |
| Colorless     | Blue, Yellow, Red, Green, Purple, Orange |
| Green         | Green only                               |
| Purple        | Purple only                              |
| Orange        | Orange only                              |
| Moon          | Moon only                                |
| Sun           | Sun only                                 |

### Crafting Slot Categories

1. **Augment Slots** - Accept colored gem augments
2. **Set Bonus Slots** - Allow selecting which set bonus to activate
3. **Affix Selection Slots** - Choose one affix from available options
4. **Random Slots** - Items have random properties at drop (skip for optimization)

## Implementation

### Crafting Slot Category Detection

**File**: `src/domains/gearPlanner/craftingHelpers.ts`

```typescript
export enum CraftingSlotCategory {
  AugmentSlot = "augment",
  SetBonusSlot = "setBonus",
  AffixSelectionSlot = "affixSelection",
  RandomSlot = "random",
}

// Augment slot patterns (9 types)
const AUGMENT_SLOT_PATTERNS = [
  "Blue Augment Slot",
  "Colorless Augment Slot",
  "Green Augment Slot",
  "Moon Augment Slot",
  "Orange Augment Slot",
  "Purple Augment Slot",
  "Red Augment Slot",
  "Sun Augment Slot",
  "Yellow Augment Slot",
];

// Set bonus slot patterns
const SET_BONUS_SLOT_PATTERNS = [
  "Lost Purpose",
  "Legendary Lost Purpose",
  "Slaver's Set Bonus",
  "Legendary Slaver's Set Bonus",
  "Isle of Dread: Set Bonus Slot",
  "Random set 1",
  "Random set 2",
];

// Random/choice slots (skip for optimization)
const RANDOM_SLOT_PATTERNS = [
  "One of the following",
  "Random effect",
  "Random set",
];

export function getCraftingSlotCategory(slotType: string): CraftingSlotCategory;
```

### Augment Slot Compatibility Implementation

```typescript
const AUGMENT_SLOT_COMPATIBILITY: Record<string, string[]> = {
  blue: ["blue", "green", "purple"],
  red: ["red", "purple", "orange"],
  yellow: ["yellow", "green", "orange"],
  colorless: ["blue", "yellow", "red", "green", "purple", "orange"],
  green: ["green"],
  purple: ["purple"],
  orange: ["orange"],
  moon: ["moon"],
  sun: ["sun"],
};

export function canAugmentFitInSlot(
  augmentColor: string,
  slotColor: string,
): boolean {
  const compatibleSlots =
    AUGMENT_SLOT_COMPATIBILITY[augmentColor.toLowerCase()];
  if (!compatibleSlots) return false;
  return compatibleSlots.includes(slotColor.toLowerCase());
}
```

### Augment Color Detection

```typescript
export function getAugmentColorFromName(
  augmentName: string,
): string | undefined {
  const lower = augmentName.toLowerCase();

  if (lower.includes("colorless") || lower.includes("set augment"))
    return "colorless";
  if (lower.includes("sapphire")) return "blue";
  if (lower.includes("ruby")) return "red";
  if (lower.includes("topaz")) return "yellow";
  if (lower.includes("emerald")) return "green";
  if (lower.includes("amethyst")) return "purple";
  if (lower.includes("citrine")) return "orange";
  if (lower.includes("moon")) return "moon";
  if (lower.includes("sun")) return "sun";
  if (lower.includes("diamond")) return "colorless";

  return undefined;
}
```

### Crafting Data Structure

**File**: `src/api/ddoGearPlanner/crafting.ts`

```typescript
export interface CraftingOption {
  name?: string; // Augment/option name
  affixes?: ItemAffix[]; // Affixes provided
  quests?: string[]; // Where to obtain
  ml?: number; // Minimum level requirement
  set?: string; // Set membership (for Set Augments)
}

// Structure: [SlotType] -> [ItemName or "*"] -> CraftingOption[]
// "*" = universal options for any item with this slot
export type CraftingData = Record<string, Record<string, CraftingOption[]>>;
```

### Available Crafting Options

```typescript
export function getAvailableCraftingOptions(
  craftingData: CraftingData | null,
  slotType: string,
  itemName: string,
): CraftingOption[] {
  // 1. Get slot data
  const slotData = craftingData[slotType];

  // 2. Check item-specific options first, then fall back to universal "*"
  let options = slotData[itemName] || slotData["*"] || [];

  // 3. For augment slots, also include compatible augments from other colors
  if (isAugmentSlot(slotType)) {
    const slotColor = getAugmentSlotColor(slotType);
    // Find augment colors that can fit in this slot
    for (const [augmentColor, compatibleSlots] of AUGMENT_SLOT_COMPATIBILITY) {
      if (compatibleSlots.includes(slotColor) && augmentColor !== slotColor) {
        // Add augments from compatible slot types
        options = [...options, ...compatibleSlotOptions];
      }
    }
  }

  return options;
}
```

### Auto-Select Crafting Options (Stacking-Aware)

**Key Algorithm**: Select augments that provide **NEW value** (not already covered by existing affixes).

```typescript
export function autoSelectCraftingOptionsForGearSetup(
  gearSetup: Record<string, Item | undefined>,
  craftingData: CraftingData | null,
  selectedProperties: string[],
  baseAffixes: ItemAffix[],
  setsData: SetsData | null,
): GearCraftingSelections {
  // 1. Track what bonuses are already covered
  const coveredBonuses: Map<string, Map<string, number>> = new Map();
  markAffixesCovered(baseAffixes, selectedProperties, coveredBonuses);

  // 2. Collect all crafting candidates with scores
  const craftingCandidates: AugmentSlotCandidate[] = [];
  const setAugmentCandidates: SetAugmentCandidate[] = [];

  // 3. Process Set Augments first (slot enough to reach thresholds)
  for (const [setName, candidates] of setAugmentsBySet) {
    if (setProvideSelectedProperties(setName, setsData, selectedProperties)) {
      const threshold = getSetMinThreshold(setName, setsData);
      // Slot up to threshold number
    }
  }

  // 4. Sort regular candidates by score (highest first)
  // 5. Greedily select augments that provide new value
  for (const candidate of craftingCandidates) {
    const newValue = getAugmentNewValue(
      candidate.affixes,
      selectedProperties,
      coveredBonuses,
    );
    if (newValue > 0) {
      // Select this augment
      // Mark its affixes as covered
    }
  }

  return result;
}
```

### New Value Calculation

Only count value that **exceeds** what's already covered:

```typescript
function getAugmentNewValue(
  affixes: ItemAffix[],
  selectedProperties: string[],
  coveredBonuses: CoveredBonuses,
): number {
  let newValue = 0;

  for (const affix of affixes) {
    if (affix.type === "bool") continue;
    if (!selectedProperties.includes(affix.name)) continue;

    const value = parseFloat(affix.value);
    const bonusType = affix.type || "Untyped";
    const existingValue = coveredBonuses.get(affix.name)?.get(bonusType) ?? 0;

    // Only count value if higher than existing
    if (value > existingValue) {
      newValue += value - existingValue;
    }
  }

  return newValue;
}
```

### Extracting Augments as Items

**File**: `src/domains/gearPlanner/augmentHelpers.ts`

For the Item Wiki, augments are converted to Item-like objects:

```typescript
export function extractAugmentsAsItems(
  craftingData: CraftingData | null,
): Item[] {
  const augmentItems: Item[] = [];

  for (const slotType of AUGMENT_SLOT_TYPES) {
    const options = craftingData[slotType]?.["*"] || [];

    for (const option of options) {
      if (!option.name && !option.affixes?.length) continue;

      augmentItems.push({
        name: option.name || generateAugmentName(option.affixes),
        ml: option.ml ?? 1,
        slot: "Augment", // Fixed slot type
        type: slotType, // Color (e.g., "Blue Augment Slot")
        affixes: option.affixes || [],
        quests: option.quests,
        sets: option.set ? [option.set] : undefined,
        artifact: false,
      });
    }
  }

  return augmentItems;
}
```

## Related Files

| File                                                                                           | Purpose                                 |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| [src/domains/gearPlanner/craftingHelpers.ts](../../src/domains/gearPlanner/craftingHelpers.ts) | Crafting slot logic, auto-selection     |
| [src/domains/gearPlanner/augmentHelpers.ts](../../src/domains/gearPlanner/augmentHelpers.ts)   | Augment extraction for Item Wiki        |
| [src/api/ddoGearPlanner/crafting.ts](../../src/api/ddoGearPlanner/crafting.ts)                 | Crafting data types and fetching        |
| [src/utils/itemLootHelpers.ts](../../src/utils/itemLootHelpers.ts)                             | Quest-to-item lookup including augments |

## Changelog

| Date    | Change                         | Reason                        |
| ------- | ------------------------------ | ----------------------------- |
| 2024-01 | Initial crafting support       | Basic augment slot handling   |
| 2024-02 | Added stacking-aware selection | Prevent redundant augments    |
| 2024-03 | Added Set Augment support      | Support set bonus augments    |
| 2024-04 | Added augment extraction       | Display augments in Item Wiki |
