import { createContext, useContext } from 'react'

import type { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'

export interface GearPlannerContextValue {
  items: Item[]
  augmentItems: Item[]
  craftingData: CraftingData | null
  setsData: SetsData | null
  loading: boolean
  updatedAt: number | null
  stale: boolean
  error: string | null
  refresh: (force?: boolean) => Promise<void>
}

export const GearPlannerContext = createContext<GearPlannerContextValue | null>(null)

export function useGearPlanner() {
  const context = useContext(GearPlannerContext)
  if (!context) {
    throw new Error('useGearPlanner must be used within a GearPlannerProvider')
  }
  return context
}
