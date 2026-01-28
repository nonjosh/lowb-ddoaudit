# Trove Data Structure Documentation

## Overview

DDO Helper Trove is a game extension for DDO (Dungeons & Dragons Online) that tracks and indexes all items in a player's inventory, bank, and shared bank for easy searching and management. This document explains the data structure exported by Trove and how it integrates with the Gear Planner.

## Data Location

Trove stores data per server in the following location:

```
C:\Users\<Username>\AppData\Roaming\Dungeon Helper\plugins\Trove\<ServerName>\<AccountHash>
```

Example for Shadowdale server:

```
C:\Users\Johnson\AppData\Roaming\Dungeon Helper\plugins\Trove\Shadowdale\A0DDF2BC53A2904CC1B14FEEAD4ED2C47E4091F295D7758309731381FBEC24A8
```

## File Types

Trove exports three types of JSON files:

### 1. Account File (`account.json`)

Contains shared bank data accessible by all characters on the account.

**Structure:**

```typescript
interface TroveAccountData {
  SharedBank: {
    BankType: number; // 3 = Shared Bank
    Tabs: Record<string, TroveBankTab>;
  };
}
```

### 2. Character Inventory Files (`<characterId>-inventory.json`)

Contains items in a character's inventory and equipped slots.

**Filename Pattern:** `{CharacterId}-inventory.json`

- Example: `-149463212641757296-inventory.json`

**Structure:**

```typescript
interface TroveCharacterInventory {
  CharacterId: number;
  Name: string;
  LastUpdated: string; // ISO 8601 timestamp
  Inventory: TroveItem[];
}
```

### 3. Character Bank Files (`<CharacterName>-<characterId>-bank.json`)

Contains items in a character's personal bank.

**Filename Pattern:** `{CharacterName}-{CharacterId}-bank.json`

- Example: `Nonjosh-149463212641757296-bank.json`

**Structure:**

```typescript
interface TroveCharacterBank {
  CharacterId: number;
  Name: string;
  LastUpdated: string | null;
  PersonalBank: {
    BankType: number; // 1 = Personal Bank
    Tabs: Record<string, TroveBankTab>;
  };
}
```

## Core Data Types

### TroveBankTab

```typescript
interface TroveBankTab {
  Id: number;
  Name: string;
  Index: number;
  Pages: Record<string, TroveBankPage>;
}
```

### TroveBankPage

```typescript
interface TroveBankPage {
  Items: TroveItem[];
}
```

### TroveItem

The main item structure with all properties:

```typescript
interface TroveItem {
  // Identification
  OwnerId: number; // Character ID who owns the item
  CharacterName: string; // Name of the owning character
  ItemId: number; // Unique item instance ID
  WeenieId?: number; // Item template ID (for matching named items)

  // Location
  Container: "Equipped" | "Inventory" | "Bank" | "SharedBank";
  Tab: number;
  TabName?: string; // Present for bank items
  Row: number;
  Column: number;

  // Item Properties
  Name: string; // Item name (critical for matching)
  Description?: string;
  TreasureType: "Named" | "Random" | "Vendor" | "Undef";
  MinimumLevel?: number; // ML requirement
  ItemType?: string; // 'Jewelry', 'Weapon', 'Clothing', etc.
  ItemSubType?: string; // e.g., 'HeavyCrossbow'

  // Binding
  Binding?: "BoundToAccount" | "BoundToCharacter";

  // Equipment Info
  EquipsTo?: string[]; // e.g., ['Head'], ['First Finger', 'Second Finger']
  EquipsToFlags?: number;

  // Value & Stats
  Quantity?: number; // Stack count (default: 1)
  BaseValueCopper?: number;
  Hardness?: number;

  // Weapon-specific
  Proficiency?: string; // 'Simple', 'Martial', etc.
  WeaponType?: string;

  // Icon
  IconSource?: string; // Base64 encoded PNG image

  // Effects & Augments
  Effects: TroveItemEffect[];
  AugmentSlots?: TroveAugmentSlot[];

  // Set Bonuses
  SetBonus1Name?: string;
  SetBonus1Description?: string[];
  MinorArtifact?: boolean;

  // Sentient Weapons
  Filigrees?: unknown[];
  SentientXp?: number;

  // Charges (for consumables)
  Charges?: number;
  MaxCharges?: number;

  // Tooltip
  Hover: string; // Full tooltip text
}
```

### TroveItemEffect

```typescript
interface TroveItemEffect {
  Name: string; // e.g., "Intelligence +14"
  Description: string; // Full description text
  SubEffects?: unknown[];
}
```

### TroveAugmentSlot

```typescript
interface TroveAugmentSlot {
  Name: string; // e.g., "Green Augment Slot", "Colorless Augment Slot"
  Color: string; // 'Green', 'Colorless', 'Blue', 'Red', 'Yellow', 'Purple', 'Orange'
  Effect?: TroveItemEffect; // Present if an augment is slotted
}
```

## TreasureType Values

| Value    | Description                           |
| -------- | ------------------------------------- |
| `Named`  | Named item from a specific quest/raid |
| `Random` | Random generated loot                 |
| `Vendor` | Purchased from vendor                 |
| `Undef`  | Undefined/unknown source              |

## Container Values

| Value        | Description                     |
| ------------ | ------------------------------- |
| `Equipped`   | Currently equipped on character |
| `Inventory`  | In character's inventory bags   |
| `Bank`       | In character's personal bank    |
| `SharedBank` | In account's shared bank        |

## Matching Items with DDO Gear Planner Data

To match Trove items with items from `items.json`:

### Primary Matching: By Name

```typescript
const match = items.find((item) => item.name === troveItem.Name);
```

### Considerations:

1. **Named Items** (`TreasureType: 'Named'`): Should match directly by name
2. **Random Items**: Names like "Hardy 8 Ring of Dexterity 6" won't match named items
3. **Case Sensitivity**: Names should match exactly (case-sensitive)
4. **Legendary Prefix**: Some items have "Legendary" prefix variants

## Implementation Notes

### Identifying User's Characters

From the file naming convention, extract:

- Character ID from inventory filenames: `-{id}-inventory.json`
- Character name and ID from bank filenames: `{name}-{id}-bank.json`
- Use `account.json` for shared bank items

### Building Item Location Map

```typescript
type ItemLocation = {
  characterName: string;
  characterId: number;
  container: "Equipped" | "Inventory" | "Bank" | "SharedBank";
  tab?: number;
  tabName?: string;
};

type TroveInventoryMap = Map<string, ItemLocation[]>; // itemName -> locations
```

### Handling BTC (Bound to Character) Items

- Items with `Binding: 'BoundToCharacter'` can only be used by the specific character
- Items with `Binding: 'BoundToAccount'` or no binding can be shared

## Related Files

- **API Layer**: `src/api/trove/` (to be created)
- **Storage**: `src/storage/troveDb.ts` (to be created)
- **Components**: `src/components/gearPlanner/TroveImportDialog.tsx` (to be created)

## Changelog

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-28 | Initial documentation created |
