import { ReactNode, useCallback, useState } from 'react'

import {
  fetchCraftingWithMetadata,
  fetchItemsWithMetadata,
  fetchSetsWithMetadata,
} from '@/api/ddoGearPlanner'
import { extractAugmentsAsItems } from '@/domains/gearPlanner'

import { GearPlannerContext, GearPlannerContextValue } from './useGearPlanner'

type GearPlannerState = Omit<GearPlannerContextValue, 'refresh'>

interface GearPlannerProviderProps {
  children: ReactNode
}

export function GearPlannerProvider({ children }: GearPlannerProviderProps) {
  const [state, setState] = useState<GearPlannerState>({
    items: [],
    augmentItems: [],
    craftingData: null,
    setsData: null,
    loading: false,
    updatedAt: null,
    stale: false,
    error: null
  })

  const refresh = useCallback(async (force = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [itemsResult, craftingResult, setsResult] = await Promise.all([
        fetchItemsWithMetadata({ forceRefresh: force }),
        fetchCraftingWithMetadata({ forceRefresh: force }),
        fetchSetsWithMetadata({ forceRefresh: force })
      ])

      const timestamps = [
        itemsResult.updatedAt,
        craftingResult.updatedAt,
        setsResult.updatedAt
      ].filter((value): value is number => typeof value === 'number')

      // Extract augments from crafting data as pseudo-items
      const augmentItems = extractAugmentsAsItems(craftingResult.data)

      setState({
        items: itemsResult.data,
        augmentItems,
        craftingData: craftingResult.data,
        setsData: setsResult.data,
        loading: false,
        updatedAt: timestamps.length ? Math.min(...timestamps) : null,
        stale: itemsResult.stale || craftingResult.stale || setsResult.stale,
        error: null
      })
    } catch (error) {
      console.error(error)
      const message = (error as Error)?.message ?? 'Failed to load item data.'
      setState(prev => ({
        ...prev,
        loading: false,
        error: message
      }))
    }
  }, [])

  const value: GearPlannerContextValue = {
    ...state,
    refresh
  }

  return (
    <GearPlannerContext.Provider value={value}>
      {children}
    </GearPlannerContext.Provider>
  )
}