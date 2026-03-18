---
name: ddo-set-bonuses
description: "DDO set bonus mechanics, threshold activation, set augment suppression, set bonus slots, and set item counting. Use when modifying set bonus logic, set threshold calculations, set augment handling, set bonus slot patterns (Lost Purpose, Slaver's), or set data fetching."
---

# DDO Set Bonuses Logic

## When to Use

- Modifying set bonus threshold logic
- Working with set augment suppression rules
- Adding new set bonus slot patterns
- Changing set item counting in gear evaluation
- Working with `SetsData` or set-related functions

## Game Rules

### Set Mechanics

1. Items belong to sets via `sets` property
2. Bonuses activate when equipped count ≥ threshold
3. Set bonus affixes follow normal stacking rules
4. Set Augments count as +1 toward threshold but **suppress** item's inherent sets

### Set Augment Suppression

When a Set Augment is slotted into an item:

- Item stops counting toward its original sets
- Item only counts toward the Set Augment's set
- Only one Set Augment should be active per item
- Auto-selection must compare value gained vs lost

## Data Structure

**File**: `src/api/ddoGearPlanner/sets.ts`

```typescript
interface SetBonus {
  threshold: number;
  affixes: ItemAffix[];
}

type SetsData = Record<string, SetBonus[]>;
```

## Set Counting Algorithm

**File**: `src/domains/gearPlanner/gearSetup.ts` (in `getGearAffixes()`)

1. Count set items from equipped gear (`item.sets`)
2. Add set memberships from Set Augments (`additionalSetMemberships`)
3. For each set, if count ≥ threshold → add bonus affixes

## Set Bonus Slots

Special crafting slots to choose which set to activate:

```
"Lost Purpose", "Legendary Lost Purpose",
"Slaver's Set Bonus", "Legendary Slaver's Set Bonus",
"Isle of Dread: Set Bonus Slot", "Random set 1", "Random set 2"
```

## Helper Functions

**File**: `src/domains/gearPlanner/craftingHelpers.ts`

- `setProvideSelectedProperties(setName, setsData, properties)` — Check if set bonus provides desired properties
- `getSetMinThreshold(setName, setsData)` — Minimum items needed
- `getCraftingSetMemberships(selections)` — Extract set names from crafting selections

## Related Files

| File                                         | Purpose                     |
| -------------------------------------------- | --------------------------- |
| `src/api/ddoGearPlanner/sets.ts`             | Set data types and fetching |
| `src/domains/gearPlanner/gearSetup.ts`       | Set bonus application       |
| `src/domains/gearPlanner/craftingHelpers.ts` | Set Augment handling        |
