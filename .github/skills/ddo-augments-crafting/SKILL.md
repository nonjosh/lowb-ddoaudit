---
name: ddo-augments-crafting
description: "DDO augment slots, crafting options, augment color compatibility, set augments, set suppression, auto-selection algorithm, and Lammodia augments. Use when modifying augment slot logic, crafting slot categories, augment color matching, set augment handling, crafting auto-selection, or augment extraction for the wiki."
---

# DDO Augments & Crafting Logic

## When to Use

- Modifying augment slot types or color compatibility
- Adding new crafting slot categories
- Working with set augments or set suppression logic
- Changing auto-selection algorithm for crafting
- Working with Lammodia augment slots
- Extracting augments as items for the wiki

## Augment Types (9 Colors)

Blue, Red, Yellow, Green, Purple, Orange, Colorless, Moon, Sun

## Augment Slot Compatibility

| Augment Color | Fits In Slots                            |
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

## Crafting Slot Categories

```typescript
enum CraftingSlotCategory {
  AugmentSlot = "augment",
  SetBonusSlot = "setBonus",
  AffixSelectionSlot = "affixSelection",
  RandomSlot = "random",
}
```

## Set Augment Suppression (Critical Rule)

When a Set Augment is slotted into an item:

- It **suppresses** the item's inherent set memberships
- The item only counts toward the Set Augment's set
- Cannot benefit from both a Set Augment's set AND built-in sets on same item
- Only one Set Augment should be active per item

**Auto-selection must weigh**: gaining set progress vs losing item's contribution to existing sets.

## Lammodia Augment Slots

Special slots from Chill of Ravenloft items:

- Melancholic, Dolorous, Miserable, Woeful (Weapon and Accessory variants)
- Sorted to bottom of crafting slot lists in UI

## Key Data Structures

```typescript
interface CraftingOption {
  name?: string;
  affixes?: ItemAffix[];
  quests?: string[];
  ml?: number;
  set?: string; // Set membership for Set Augments
}

// [SlotType] -> [ItemName or "*"] -> CraftingOption[]
type CraftingData = Record<string, Record<string, CraftingOption[]>>;
```

## Auto-Selection Algorithm

**File**: `src/domains/gearPlanner/craftingHelpers.ts`

`autoSelectCraftingOptionsForGearSetup()`:

1. Track already-covered bonuses from base affixes
2. Process Set Augments first (slot enough to reach thresholds)
3. Score regular augments by **new value** (exceeds existing coverage)
4. Greedily select highest-scoring augments
5. Mark selected affixes as covered to avoid redundancy

**New Value Calculation**: Only counts value that exceeds what's already covered for the same property + bonus type.

## Augment Color Detection

Detects color from augment name keywords: sapphire→blue, ruby→red, topaz→yellow, emerald→green, amethyst→purple, citrine→orange, diamond→colorless, "set augment"→colorless.

## Set Bonus Slot Patterns

```
"Lost Purpose", "Legendary Lost Purpose",
"Slaver's Set Bonus", "Legendary Slaver's Set Bonus",
"Isle of Dread: Set Bonus Slot", "Random set 1/2"
```

## Related Files

| File                                         | Purpose                                 |
| -------------------------------------------- | --------------------------------------- |
| `src/domains/gearPlanner/craftingHelpers.ts` | Crafting slot logic, auto-selection     |
| `src/domains/gearPlanner/augmentHelpers.ts`  | Augment extraction for wiki             |
| `src/api/ddoGearPlanner/crafting.ts`         | Crafting data types and fetching        |
| `src/utils/itemLootHelpers.ts`               | Quest-to-item lookup including augments |
