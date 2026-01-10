import Dexie, { Table } from 'dexie'

export type GearPlannerDatasetKey = 'items' | 'crafting' | 'sets'

export interface GearPlannerDatasetRecord<TData = unknown> {
  key: GearPlannerDatasetKey
  updatedAt: number
  data: TData
}

class GearPlannerDatabase extends Dexie {
  datasets!: Table<GearPlannerDatasetRecord>

  constructor() {
    super('gear-planner-cache')
    this.version(1).stores({
      datasets: '&key, updatedAt'
    })
  }
}

export const gearPlannerDb = new GearPlannerDatabase()

export const GEAR_PLANNER_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

export type GearPlannerDatasetInfo = {
  key: GearPlannerDatasetKey
  updatedAt: number
}
