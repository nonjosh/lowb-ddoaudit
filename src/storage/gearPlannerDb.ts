import Dexie, { Table } from 'dexie'

export type GearPlannerDatasetKey = 'items' | 'crafting' | 'sets'

export interface GearPlannerDatasetRecord<TData = unknown> {
  key: GearPlannerDatasetKey
  updatedAt: number
  data: TData
}

/**
 * Serialized gear setup stored in IndexedDB.
 * Items are stored by name (resolved against the items list at load time).
 */
export interface SavedGearSetup {
  id?: number
  name: string
  createdAt: number
  updatedAt: number
  /** Slot name -> item name */
  setup: Record<string, string>
  /** Serialized crafting selections: gearSlot -> array of { slotType, optionName } */
  craftingSelections?: Record<string, { slotType: string; optionName: string | null }[]>
  pinnedSlots?: string[]
}

/**
 * Saved property filter preset.
 */
export interface SavedPropertyPreset {
  id?: number
  name: string
  createdAt: number
  updatedAt: number
  properties: string[]
  sets: string[]
}

class GearPlannerDatabase extends Dexie {
  datasets!: Table<GearPlannerDatasetRecord>
  gearSetups!: Table<SavedGearSetup, number>
  propertyPresets!: Table<SavedPropertyPreset, number>

  constructor() {
    super('gear-planner-cache')
    this.version(1).stores({
      datasets: '&key, updatedAt'
    })
    this.version(2).stores({
      datasets: '&key, updatedAt',
      gearSetups: '++id, name, updatedAt',
      propertyPresets: '++id, name, updatedAt'
    })
  }
}

export const gearPlannerDb = new GearPlannerDatabase()

export const GEAR_PLANNER_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

export type GearPlannerDatasetInfo = {
  key: GearPlannerDatasetKey
  updatedAt: number
}
