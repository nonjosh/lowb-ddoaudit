---
name: ddo-gear-affixes
description: "DDO gear affix stacking rules, bonus types, complex properties, and gear evaluation. Use when modifying affix stacking logic, gear slots, property calculation, complex properties (Well Rounded, Sheltering, Parrying, Spell DC, Tactic DC, Spell Focus Mastery), minor artifact limits, or the gear planner evaluation."
---

# DDO Gear & Affix Stacking Logic

## When to Use

- Modifying affix stacking rules or `combineAffixes()`
- Adding new bonus types or complex properties
- Working with gear slot configuration
- Changing gear evaluation logic (`evaluateGearSetup`)
- Handling minor artifact constraints

## Affix Stacking Rules

**Core Rule**: Same property + same bonus type → only highest value applies.

| Scenario                       | Stacks?           |
| ------------------------------ | ----------------- |
| Same property, same type       | NO (highest wins) |
| Same property, different types | YES               |
| Different properties           | YES               |

## Bonus Types

Enhancement, Insight, Quality, Profane, Sacred, Exceptional, Competence, Equipment, Artifact

## Complex Properties

These expand to multiple underlying properties during calculation:

| Complex Property    | Expands To                    |
| ------------------- | ----------------------------- |
| Well Rounded        | All 6 ability scores          |
| Sheltering          | Physical + Magical Sheltering |
| Parrying            | Fort/Reflex/Will Save + AC    |
| Spell DC            | All 8 school DCs              |
| Tactic DC           | Stunning/Sunder/Trip DC       |
| Spell Focus Mastery | All 8 school Focus values     |

**Note**: "Spell Focus" is normalized to "Spell Focus Mastery" in code.

Complex properties should be **expanded** during calculation and **excluded** from property selection dropdowns.

## Minor Artifact Limit

A character can only wear **ONE minor artifact** at a time. Items have `artifact: true` field.

## Key Data Structures

```typescript
interface ItemAffix {
  name: string; // Property name (e.g., "Strength")
  type: string; // Bonus type (e.g., "Enhancement", "bool")
  value: string | number;
}

interface Item {
  name: string;
  ml: number;
  slot: string;
  type?: string;
  affixes: ItemAffix[];
  crafting?: string[];
  sets?: string[];
  quests?: string[];
  artifact?: boolean;
}
```

## Gear Slots

```typescript
const GEAR_SLOTS = [
  "Armor",
  "Belt",
  "Boots",
  "Bracers",
  "Cloak",
  "Gloves",
  "Goggles",
  "Helm",
  "Necklace",
  "Ring", // Can have ring1 + ring2
  "Trinket",
] as const;
```

## Key Functions

**File**: `src/domains/gearPlanner/affixStacking.ts`

- `combineAffixes(affixes)` — Applies stacking rules, returns `Map<string, PropertyValue>`
- Boolean affixes (type `"bool"`) are skipped in numeric calculations

**File**: `src/domains/gearPlanner/gearSetup.ts`

- `getGearAffixes(setup, setsData, additionalSetMemberships)` — Collects all affixes from gear + set bonuses

**File**: `src/domains/gearPlanner/optimization.ts`

- `evaluateGearSetup(setup, properties, setsData, ...)` — Full evaluation with breakdowns

## Related Files

| File                                       | Purpose                 |
| ------------------------------------------ | ----------------------- |
| `src/domains/gearPlanner/affixStacking.ts` | Affix combination logic |
| `src/domains/gearPlanner/gearSetup.ts`     | Gear slots and setup    |
| `src/domains/gearPlanner/optimization.ts`  | Gear evaluation         |
| `src/api/ddoGearPlanner/items.ts`          | Item data types         |
