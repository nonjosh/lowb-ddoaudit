import Dexie, { Table } from 'dexie'

import type {
  TroveAccountData,
  TroveCharacter,
  TroveCharacterBank,
  TroveCharacterInventory,
  TroveItemLocation
} from '@/api/trove/types'

// ============================================================================
// Database Types
// ============================================================================

export interface TroveInventoryRecord {
  itemName: string
  locations: TroveItemLocation[]
}

export interface TroveMetaRecord {
  key:
  | 'accountData'
  | 'characterBanks'
  | 'characterInventories'
  | 'characters'
  | 'hiddenCharacters'
  | 'importedAt'
  | 'selectedCharacters'
  value: unknown
}

export interface TroveSnapshot {
  accountData: TroveAccountData | null
  characterBanks: TroveCharacterBank[]
  characterInventories: TroveCharacterInventory[]
  inventoryMap: Map<string, TroveItemLocation[]>
  characters: TroveCharacter[]
  hiddenCharacterIds: number[]
  importedAt: number | null
  selectedCharacterIds: number[]
}

// ============================================================================
// Database Class
// ============================================================================

class TroveDatabase extends Dexie {
  inventory!: Table<TroveInventoryRecord>
  meta!: Table<TroveMetaRecord>

  constructor() {
    super('trove-data')
    this.version(1).stores({
      inventory: '&itemName',
      meta: '&key'
    })
  }
}

export const troveDb = new TroveDatabase()

function buildInventoryRecords(inventoryMap: Map<string, TroveItemLocation[]>): TroveInventoryRecord[] {
  const records: TroveInventoryRecord[] = []

  for (const [itemName, locations] of inventoryMap) {
    records.push({ itemName, locations })
  }

  return records
}

// ============================================================================
// Storage Functions
// ============================================================================

/**
 * Clear all Trove data
 */
export async function clearTroveData(): Promise<void> {
  await troveDb.transaction('rw', troveDb.inventory, troveDb.meta, async () => {
    await troveDb.inventory.clear()
    await troveDb.meta.clear()
  })
}

/**
 * Save Trove inventory data.
 * Clears old data first to ensure consistency between state and IndexedDB.
 */
export async function saveTroveInventory(
  inventoryMap: Map<string, TroveItemLocation[]>
): Promise<void> {
  const records = buildInventoryRecords(inventoryMap)

  await troveDb.transaction('rw', troveDb.inventory, async () => {
    await troveDb.inventory.clear()
    await troveDb.inventory.bulkPut(records)
  })
}

/**
 * Save a complete Trove snapshot atomically so reloads never see half-written state.
 */
export async function saveTroveSnapshot(snapshot: TroveSnapshot): Promise<void> {
  const inventoryRecords = buildInventoryRecords(snapshot.inventoryMap)
  const metaRecords: TroveMetaRecord[] = [
    { key: 'accountData', value: snapshot.accountData },
    { key: 'characterBanks', value: snapshot.characterBanks },
    { key: 'characterInventories', value: snapshot.characterInventories },
    { key: 'characters', value: snapshot.characters },
    { key: 'hiddenCharacters', value: snapshot.hiddenCharacterIds },
    { key: 'importedAt', value: snapshot.importedAt },
    { key: 'selectedCharacters', value: snapshot.selectedCharacterIds },
  ]

  await troveDb.transaction('rw', troveDb.inventory, troveDb.meta, async () => {
    await troveDb.inventory.clear()
    await troveDb.inventory.bulkPut(inventoryRecords)
    await troveDb.meta.bulkPut(metaRecords)
  })
}

/**
 * Load the full Trove snapshot in one read transaction.
 */
export async function loadTroveSnapshot(): Promise<TroveSnapshot> {
  return troveDb.transaction('r', troveDb.inventory, troveDb.meta, async () => {
    const [inventoryRecords, metaRecords] = await Promise.all([
      troveDb.inventory.toArray(),
      troveDb.meta.toArray(),
    ])

    const inventoryMap = new Map<string, TroveItemLocation[]>()
    for (const record of inventoryRecords) {
      inventoryMap.set(record.itemName, record.locations)
    }

    const metaByKey = new Map(metaRecords.map((record) => [record.key, record.value]))

    return {
      accountData: (metaByKey.get('accountData') as TroveAccountData | null) ?? null,
      characterBanks: (metaByKey.get('characterBanks') as TroveCharacterBank[]) ?? [],
      characterInventories: (metaByKey.get('characterInventories') as TroveCharacterInventory[]) ?? [],
      inventoryMap,
      characters: (metaByKey.get('characters') as TroveCharacter[]) ?? [],
      hiddenCharacterIds: (metaByKey.get('hiddenCharacters') as number[]) ?? [],
      importedAt: (metaByKey.get('importedAt') as number | null) ?? null,
      selectedCharacterIds: (metaByKey.get('selectedCharacters') as number[]) ?? [],
    }
  })
}

/**
 * Save Trove characters
 */
export async function saveTroveCharacters(
  characters: TroveCharacter[]
): Promise<void> {
  await troveDb.meta.put({ key: 'characters', value: characters })
}

/**
 * Save shared account Trove data
 */
export async function saveTroveAccountData(
  accountData: TroveAccountData | null
): Promise<void> {
  await troveDb.meta.put({ key: 'accountData', value: accountData })
}

/**
 * Save character inventory snapshots
 */
export async function saveTroveCharacterInventories(
  characterInventories: TroveCharacterInventory[]
): Promise<void> {
  await troveDb.meta.put({ key: 'characterInventories', value: characterInventories })
}

/**
 * Save character bank snapshots
 */
export async function saveTroveCharacterBanks(
  characterBanks: TroveCharacterBank[]
): Promise<void> {
  await troveDb.meta.put({ key: 'characterBanks', value: characterBanks })
}

/**
 * Save import timestamp
 */
export async function saveTroveImportTime(timestamp: number): Promise<void> {
  await troveDb.meta.put({ key: 'importedAt', value: timestamp })
}

/**
 * Save selected character IDs for filtering
 */
export async function saveTroveSelectedCharacters(
  characterIds: number[]
): Promise<void> {
  await troveDb.meta.put({ key: 'selectedCharacters', value: characterIds })
}

/**
 * Load Trove inventory as a Map
 */
export async function loadTroveInventory(): Promise<Map<string, TroveItemLocation[]>> {
  const records = await troveDb.inventory.toArray()
  const map = new Map<string, TroveItemLocation[]>()

  for (const record of records) {
    map.set(record.itemName, record.locations)
  }

  return map
}

/**
 * Load Trove characters
 */
export async function loadTroveCharacters(): Promise<TroveCharacter[]> {
  const record = await troveDb.meta.get('characters')
  return (record?.value as TroveCharacter[]) || []
}

/**
 * Load shared account Trove data
 */
export async function loadTroveAccountData(): Promise<TroveAccountData | null> {
  const record = await troveDb.meta.get('accountData')
  return (record?.value as TroveAccountData | null) || null
}

/**
 * Load character inventory snapshots
 */
export async function loadTroveCharacterInventories(): Promise<TroveCharacterInventory[]> {
  const record = await troveDb.meta.get('characterInventories')
  return (record?.value as TroveCharacterInventory[]) || []
}

/**
 * Load character bank snapshots
 */
export async function loadTroveCharacterBanks(): Promise<TroveCharacterBank[]> {
  const record = await troveDb.meta.get('characterBanks')
  return (record?.value as TroveCharacterBank[]) || []
}

/**
 * Load import timestamp
 */
export async function loadTroveImportTime(): Promise<number | null> {
  const record = await troveDb.meta.get('importedAt')
  return (record?.value as number) || null
}

/**
 * Load selected character IDs
 */
export async function loadTroveSelectedCharacters(): Promise<number[]> {
  const record = await troveDb.meta.get('selectedCharacters')
  return (record?.value as number[]) || []
}

/**
 * Save hidden character IDs
 */
export async function saveTroveHiddenCharacters(
  characterIds: number[]
): Promise<void> {
  await troveDb.meta.put({ key: 'hiddenCharacters', value: characterIds })
}

/**
 * Load hidden character IDs
 */
export async function loadTroveHiddenCharacters(): Promise<number[]> {
  const record = await troveDb.meta.get('hiddenCharacters')
  return (record?.value as number[]) || []
}

/**
 * Check if an item exists in the Trove inventory
 */
export async function hasItemInTrove(itemName: string): Promise<boolean> {
  const record = await troveDb.inventory.get(itemName)
  return !!record
}

/**
 * Get locations for an item
 */
export async function getItemLocations(
  itemName: string
): Promise<TroveItemLocation[] | null> {
  const record = await troveDb.inventory.get(itemName)
  return record?.locations || null
}
