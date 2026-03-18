---
name: ddo-trove-data
description: "DDO Helper Trove data structure, inventory/bank/shared bank file formats, TroveItem schema, item matching with gear planner data, augment slots, treasure types, and container types. Use when importing Trove data, matching Trove items to items.json, working with Trove file parsing, or building inventory features."
---

# DDO Trove Data Structure

## When to Use

- Importing Trove inventory data
- Matching Trove items with DDO Gear Planner data
- Parsing Trove JSON file formats
- Building inventory management features

## About DDO Helper

DDO Helper is a third-party browser extension / game overlay for DDO. Its **Trove** plugin indexes all items in a player's inventory, bank, and shared bank.

### Data Location (User's PC)

```
C:\Users\<Username>\AppData\Roaming\Dungeon Helper\plugins\Trove\<ServerName>\<AccountHash>
```

### Import Flow

Users export Trove JSON files and import them into this app via a file picker dialog. The parser auto-detects file type from the filename pattern.

## Parser Functions

**File**: `src/api/trove/`

| Function                    | Input                     | Output                                            |
| --------------------------- | ------------------------- | ------------------------------------------------- |
| `detectTroveFileType()`     | Filename                  | `'inventory' \| 'bank' \| 'account' \| 'unknown'` |
| `parseTroveInventoryFile()` | JSON string               | `TroveCharacterInventory \| null`                 |
| `parseTroveBankFile()`      | JSON string               | `TroveCharacterBank \| null`                      |
| `parseTroveAccountFile()`   | JSON string               | `TroveAccountData \| null`                        |
| `buildTroveData()`          | `ParsedTroveFile[]`       | `TroveData`                                       |
| `parseMultipleTroveFiles()` | `File[]`                  | `Promise<TroveData>`                              |
| `isItemAvailable()`         | Item name + inventory map | `boolean`                                         |

## File Types

### 1. Account File (`account.json`)

Shared bank data. Structure: `{ SharedBank: { BankType: 3, Tabs: {...} } }`

### 2. Character Inventory (`{CharacterId}-inventory.json`)

```typescript
interface TroveCharacterInventory {
  CharacterId: number;
  Name: string;
  LastUpdated: string; // ISO 8601
  Inventory: TroveItem[];
}
```

### 3. Character Bank (`{CharacterName}-{CharacterId}-bank.json`)

```typescript
interface TroveCharacterBank {
  CharacterId: number;
  Name: string;
  LastUpdated: string | null;
  PersonalBank: { BankType: 1, Tabs: {...} };
}
```

## TroveItem Key Fields

```typescript
interface TroveItem {
  OwnerId: number;
  CharacterName: string;
  ItemId: number;
  WeenieId?: number; // Template ID for named items
  Container: "Equipped" | "Inventory" | "Bank" | "SharedBank";
  Name: string; // Critical for matching
  TreasureType: "Named" | "Random" | "Vendor" | "Undef";
  MinimumLevel?: number;
  ItemType?: string; // 'Jewelry', 'Weapon', 'Clothing'
  Binding?: "BoundToAccount" | "BoundToCharacter";
  EquipsTo?: string[];
  Effects: TroveItemEffect[];
  AugmentSlots?: TroveAugmentSlot[];
  SetBonus1Name?: string;
  MinorArtifact?: boolean;
  Hover: string; // Full tooltip text
}
```

## Item Matching

Primary matching by exact name:

```typescript
const match = items.find((item) => item.name === troveItem.Name);
```

- **Named items** (`TreasureType: 'Named'`): Match directly
- **Random items**: Won't match named items (e.g., "Hardy 8 Ring of Dexterity 6")
- Case-sensitive matching
- Some items have "Legendary" prefix variants

## BTC vs BTA

- `BoundToCharacter`: Only usable by specific character
- `BoundToAccount` or no binding: Can be shared

## Related Files

| File                            | Purpose            |
| ------------------------------- | ------------------ |
| `src/api/trove/`                | Trove API layer    |
| `src/contexts/TroveContext.tsx` | Trove data context |
| `src/contexts/useTrove.ts`      | Trove context hook |
