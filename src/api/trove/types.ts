/**
 * Trove Data Types
 *
 * DDO Helper Trove is a game extension that tracks items in player inventories.
 * These types represent the JSON structure exported by Trove.
 */

// ============================================================================
// Item Effect Types
// ============================================================================

export interface TroveItemEffect {
  Name: string
  Description: string
  SubEffects?: unknown[]
}

export interface TroveAugmentSlot {
  Name: string // e.g., "Green Augment Slot", "Colorless Augment Slot"
  Color: string // 'Green', 'Colorless', 'Blue', 'Red', 'Yellow', 'Purple', 'Orange'
  Effect?: TroveItemEffect // Present if an augment is slotted
}

// ============================================================================
// Item Types
// ============================================================================

export type TroveContainer = 'Equipped' | 'Inventory' | 'Bank' | 'SharedBank'
export type TroveTreasureType = 'Named' | 'Random' | 'Vendor' | 'Undef'
export type TroveBinding = 'BoundToAccount' | 'BoundToCharacter'

export interface TroveItem {
  // Identification
  OwnerId: number
  CharacterName: string
  ItemId: number
  WeenieId?: number

  // Location
  Container: TroveContainer
  Tab: number
  TabName?: string
  Row: number
  Column: number

  // Item Properties
  Name: string
  Description?: string
  TreasureType: TroveTreasureType
  MinimumLevel?: number
  ItemType?: string
  ItemSubType?: string

  // Binding
  Binding?: TroveBinding

  // Equipment Info
  EquipsTo?: string[]
  EquipsToFlags?: number

  // Value & Stats
  Quantity?: number
  BaseValueCopper?: number
  Hardness?: number

  // Weapon-specific
  Proficiency?: string
  WeaponType?: string

  // Icon
  IconSource?: string

  // Effects & Augments
  Effects: TroveItemEffect[]
  AugmentSlots?: TroveAugmentSlot[]

  // Set Bonuses
  SetBonus1Name?: string
  SetBonus1Description?: string[]
  MinorArtifact?: boolean

  // Sentient Weapons
  Filigrees?: unknown[]
  SentientXp?: number

  // Charges (for consumables)
  Charges?: number
  MaxCharges?: number

  // Tooltip
  Hover: string
}

// ============================================================================
// Bank Structure Types
// ============================================================================

export interface TroveBankPage {
  Items: TroveItem[]
}

export interface TroveBankTab {
  Id: number
  Name: string
  Index: number
  Pages: Record<string, TroveBankPage>
}

export interface TroveBank {
  BankType: number // 1 = Personal Bank, 3 = Shared Bank
  Tabs: Record<string, TroveBankTab>
}

// ============================================================================
// File Structure Types
// ============================================================================

export interface TroveCharacterInventory {
  CharacterId: number
  Name: string
  LastUpdated: string | null
  Inventory: TroveItem[]
}

export interface TroveCharacterBank {
  CharacterId: number
  Name: string
  LastUpdated: string | null
  PersonalBank: TroveBank
}

export interface TroveAccountData {
  SharedBank: TroveBank
}

// ============================================================================
// Processed Data Types
// ============================================================================

export interface TroveItemLocation {
  characterName: string
  characterId: number
  container: TroveContainer
  tab?: number
  tabName?: string
  binding?: TroveBinding
}

export interface TroveCharacter {
  id: number
  name: string
}

/**
 * Map of item name to list of locations where it's found
 */
export type TroveInventoryMap = Map<string, TroveItemLocation[]>

/**
 * Complete parsed Trove data
 */
export interface TroveData {
  inventoryMap: TroveInventoryMap
  characters: TroveCharacter[]
  importedAt: number
}
