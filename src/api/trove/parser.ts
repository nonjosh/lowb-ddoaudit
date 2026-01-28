/**
 * Trove Data Parser
 *
 * Functions for parsing DDO Helper Trove JSON files and building
 * an inventory map for use in the Gear Planner.
 */

import type {
  TroveAccountData,
  TroveBank,
  TroveCharacter,
  TroveCharacterBank,
  TroveCharacterInventory,
  TroveData,
  TroveInventoryMap,
  TroveItem,
  TroveItemLocation
} from './types'

// ============================================================================
// File Type Detection
// ============================================================================

export type TroveFileType = 'inventory' | 'bank' | 'account' | 'unknown'

/**
 * Detect the type of Trove file from its filename
 */
export function detectTroveFileType(filename: string): TroveFileType {
  const lowerName = filename.toLowerCase()

  if (lowerName === 'account.json') {
    return 'account'
  }

  if (lowerName.endsWith('-inventory.json')) {
    return 'inventory'
  }

  if (lowerName.endsWith('-bank.json')) {
    return 'bank'
  }

  return 'unknown'
}

// ============================================================================
// File Parsers
// ============================================================================

/**
 * Parse a character inventory JSON file
 */
export function parseTroveInventoryFile(
  jsonContent: string
): TroveCharacterInventory | null {
  try {
    const data = JSON.parse(jsonContent) as TroveCharacterInventory
    // Validate required fields
    if (
      typeof data.CharacterId !== 'number' ||
      typeof data.Name !== 'string' ||
      !Array.isArray(data.Inventory)
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Parse a character bank JSON file
 */
export function parseTroveBankFile(
  jsonContent: string
): TroveCharacterBank | null {
  try {
    const data = JSON.parse(jsonContent) as TroveCharacterBank
    // Validate required fields
    if (
      typeof data.CharacterId !== 'number' ||
      typeof data.Name !== 'string' ||
      !data.PersonalBank
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Parse the account JSON file (shared bank)
 */
export function parseTroveAccountFile(
  jsonContent: string
): TroveAccountData | null {
  try {
    const data = JSON.parse(jsonContent) as TroveAccountData
    // Validate required fields
    if (!data.SharedBank) {
      return null
    }
    return data
  } catch {
    return null
  }
}

// ============================================================================
// Item Extraction
// ============================================================================

/**
 * Extract all items from a bank structure
 */
function extractItemsFromBank(bank: TroveBank): TroveItem[] {
  const items: TroveItem[] = []

  if (!bank.Tabs) return items

  for (const tab of Object.values(bank.Tabs)) {
    if (!tab.Pages) continue

    for (const page of Object.values(tab.Pages)) {
      if (!page.Items) continue

      for (const item of page.Items) {
        items.push(item)
      }
    }
  }

  return items
}

/**
 * Add items to the inventory map with their locations
 */
function addItemsToMap(
  map: TroveInventoryMap,
  items: TroveItem[],
  characterName: string,
  characterId: number
): void {
  for (const item of items) {
    if (!item.Name) continue

    const location: TroveItemLocation = {
      characterName,
      characterId,
      container: item.Container,
      tab: item.Tab,
      tabName: item.TabName,
      binding: item.Binding
    }

    const existing = map.get(item.Name)
    if (existing) {
      existing.push(location)
    } else {
      map.set(item.Name, [location])
    }
  }
}

// ============================================================================
// Main Build Function
// ============================================================================

export interface ParsedTroveFile {
  type: TroveFileType
  filename: string
  data:
  | TroveCharacterInventory
  | TroveCharacterBank
  | TroveAccountData
  | null
}

/**
 * Parse a single Trove file based on its type
 */
export function parseTroveFile(
  filename: string,
  content: string
): ParsedTroveFile {
  const type = detectTroveFileType(filename)

  let data:
    | TroveCharacterInventory
    | TroveCharacterBank
    | TroveAccountData
    | null = null

  switch (type) {
    case 'inventory':
      data = parseTroveInventoryFile(content)
      break
    case 'bank':
      data = parseTroveBankFile(content)
      break
    case 'account':
      data = parseTroveAccountFile(content)
      break
  }

  return { type, filename, data }
}

/**
 * Build the complete Trove data from parsed files
 */
export function buildTroveData(parsedFiles: ParsedTroveFile[]): TroveData {
  const inventoryMap: TroveInventoryMap = new Map()
  const charactersMap = new Map<number, TroveCharacter>()

  for (const file of parsedFiles) {
    if (!file.data) continue

    switch (file.type) {
      case 'inventory': {
        const inv = file.data as TroveCharacterInventory
        // Add character
        if (!charactersMap.has(inv.CharacterId)) {
          charactersMap.set(inv.CharacterId, {
            id: inv.CharacterId,
            name: inv.Name
          })
        }
        // Add items
        addItemsToMap(inventoryMap, inv.Inventory, inv.Name, inv.CharacterId)
        break
      }

      case 'bank': {
        const bank = file.data as TroveCharacterBank
        // Add character
        if (!charactersMap.has(bank.CharacterId)) {
          charactersMap.set(bank.CharacterId, {
            id: bank.CharacterId,
            name: bank.Name
          })
        }
        // Extract and add items from bank
        const bankItems = extractItemsFromBank(bank.PersonalBank)
        addItemsToMap(inventoryMap, bankItems, bank.Name, bank.CharacterId)
        break
      }

      case 'account': {
        const account = file.data as TroveAccountData
        // Extract items from shared bank
        const sharedItems = extractItemsFromBank(account.SharedBank)
        // Use a special "Shared Bank" character entry
        addItemsToMap(inventoryMap, sharedItems, 'Shared Bank', 0)
        break
      }
    }
  }

  return {
    inventoryMap,
    characters: Array.from(charactersMap.values()),
    importedAt: Date.now()
  }
}

/**
 * Parse multiple Trove files and build the inventory data
 */
export async function parseMultipleTroveFiles(
  files: File[]
): Promise<TroveData> {
  const parsedFiles: ParsedTroveFile[] = []

  for (const file of files) {
    // Skip non-JSON files
    if (!file.name.toLowerCase().endsWith('.json')) continue

    try {
      const content = await file.text()
      const parsed = parseTroveFile(file.name, content)
      parsedFiles.push(parsed)
    } catch {
      // Skip files that can't be read
      console.warn(`Failed to read file: ${file.name}`)
    }
  }

  return buildTroveData(parsedFiles)
}

/**
 * Check if an item is available based on Trove data and selected characters
 */
export function isItemAvailable(
  itemName: string,
  inventoryMap: TroveInventoryMap,
  selectedCharacterIds?: number[]
): boolean {
  const locations = inventoryMap.get(itemName)
  if (!locations || locations.length === 0) return false

  // If no character filter, any location counts
  if (!selectedCharacterIds || selectedCharacterIds.length === 0) {
    return true
  }

  // Check if item is available to any selected character
  return locations.some((loc) => {
    // Shared bank (characterId = 0) is always available
    if (loc.characterId === 0) return true

    // BTA items are available to all
    if (loc.binding !== 'BoundToCharacter') return true

    // BTC items only count if owned by a selected character
    return selectedCharacterIds.includes(loc.characterId)
  })
}

/**
 * Get human-readable location strings for an item
 */
export function getItemLocationStrings(
  itemName: string,
  inventoryMap: TroveInventoryMap
): string[] {
  const locations = inventoryMap.get(itemName)
  if (!locations) return []

  return locations.map((loc) => {
    let result = loc.characterName

    if (loc.container === 'Equipped') {
      result += ' (Equipped)'
    } else if (loc.container === 'Inventory') {
      result += ' - Inventory'
    } else if (loc.container === 'Bank') {
      result += ` - Bank${loc.tabName ? ` (${loc.tabName})` : ''}`
    } else if (loc.container === 'SharedBank') {
      result = `Shared Bank${loc.tabName ? ` (${loc.tabName})` : ''}`
    }

    return result
  })
}
