import { useCallback, useEffect, useRef, useState } from 'react'

import { CraftingData, CraftingOption, Item } from '@/api/ddoGearPlanner'
import { GearCraftingSelections, GearSetup, SelectedCraftingOption } from '@/domains/gearPlanner'
import { gearPlannerDb, SavedGearSetup } from '@/storage/gearPlannerDb'

const ACTIVE_SETUP_ID_KEY = 'gearPlanner_activeSetupId'

function loadActiveSetupId(): number | null {
  try {
    const stored = localStorage.getItem(ACTIVE_SETUP_ID_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) return parsed
    }
  } catch {
    // Ignore errors
  }
  return null
}

function saveActiveSetupId(id: number | null): void {
  try {
    if (id !== null) {
      localStorage.setItem(ACTIVE_SETUP_ID_KEY, String(id))
    } else {
      localStorage.removeItem(ACTIVE_SETUP_ID_KEY)
    }
  } catch {
    // Ignore errors
  }
}

function serializeSetup(setup: GearSetup): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [slot, item] of Object.entries(setup)) {
    if (item) result[slot] = (item as Item).name
  }
  return result
}

function deserializeSetup(saved: Record<string, string>, items: Item[]): GearSetup {
  const itemsByName = new Map(items.map(i => [i.name, i]))
  const setup: GearSetup = {}
  for (const [slot, itemName] of Object.entries(saved)) {
    const item = itemsByName.get(itemName)
    if (item) {
      ; (setup as Record<string, Item>)[slot] = item
    }
  }
  return setup
}

function serializeCrafting(
  selections: GearCraftingSelections | undefined
): Record<string, { slotType: string; optionName: string | null }[]> | undefined {
  if (!selections) return undefined
  const result: Record<string, { slotType: string; optionName: string | null }[]> = {}
  for (const [gearSlot, options] of Object.entries(selections)) {
    result[gearSlot] = options.map(opt => ({
      slotType: opt.slotType,
      optionName: opt.option?.name ?? null
    }))
  }
  return result
}

function deserializeCrafting(
  saved: Record<string, { slotType: string; optionName: string | null }[]> | undefined,
  craftingData: CraftingData | null,
  setup: GearSetup
): GearCraftingSelections | undefined {
  if (!saved || !craftingData) return undefined
  const result: GearCraftingSelections = {}
  for (const [gearSlot, savedOptions] of Object.entries(saved)) {
    const item = setup[gearSlot as keyof GearSetup]
    if (!item) continue
    result[gearSlot] = savedOptions.map((savedOpt): SelectedCraftingOption => {
      let resolvedOption: CraftingOption | null = null
      if (savedOpt.optionName !== null) {
        const slotData = craftingData[savedOpt.slotType]
        if (slotData) {
          const itemOptions = slotData[item.name] ?? slotData['*'] ?? []
          resolvedOption = itemOptions.find(o => o.name === savedOpt.optionName) ?? null
        }
      }
      return { slotType: savedOpt.slotType, option: resolvedOption }
    })
  }
  return result
}

export interface LoadedSetupData {
  setup: GearSetup
  craftingSelections?: GearCraftingSelections
  pinnedSlots: Set<string>
}

export interface UseGearSetupsReturn {
  setups: SavedGearSetup[]
  activeSetupId: number | null
  isLoaded: boolean
  selectSetup: (id: number) => void
  createSetup: () => Promise<number>
  renameSetup: (id: number, name: string) => Promise<void>
  deleteSetup: (id: number) => Promise<void>
  saveCurrentSetup: (
    setup: GearSetup,
    craftingSelections?: GearCraftingSelections,
    pinnedSlots?: Set<string>
  ) => Promise<void>
  loadSetupData: (
    id: number,
    items: Item[],
    craftingData: CraftingData | null
  ) => Promise<LoadedSetupData | null>
}

export function useGearSetups(): UseGearSetupsReturn {
  const [setups, setSetups] = useState<SavedGearSetup[]>([])
  const [activeSetupId, setActiveSetupId] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const initializedRef = useRef(false)
  const activeSetupIdRef = useRef<number | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeSetupIdRef.current = activeSetupId
  }, [activeSetupId])

  // Load setups from DB on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      const allSetups = await gearPlannerDb.gearSetups.orderBy('updatedAt').reverse().toArray()
      if (allSetups.length === 0) {
        const now = Date.now()
        const id = await gearPlannerDb.gearSetups.add({
          name: 'Untitled 1',
          createdAt: now,
          updatedAt: now,
          setup: {},
          pinnedSlots: []
        })
        const defaultSetup: SavedGearSetup = {
          id: id as number,
          name: 'Untitled 1',
          createdAt: now,
          updatedAt: now,
          setup: {},
          pinnedSlots: []
        }
        setSetups([defaultSetup])
        setActiveSetupId(id as number)
        saveActiveSetupId(id as number)
      } else {
        setSetups(allSetups)
        const savedActiveId = loadActiveSetupId()
        const activeExists = allSetups.some(s => s.id === savedActiveId)
        const newActiveId = activeExists ? savedActiveId! : allSetups[0].id!
        setActiveSetupId(newActiveId)
        saveActiveSetupId(newActiveId)
      }
      setIsLoaded(true)
    }
    void init()
  }, [])

  const selectSetup = useCallback((id: number) => {
    setActiveSetupId(id)
    saveActiveSetupId(id)
  }, [])

  const createSetup = useCallback(async () => {
    const current = await gearPlannerDb.gearSetups.toArray()
    const existingNames = current.map(s => s.name)
    let n = 1
    while (existingNames.includes(`Untitled ${n}`)) n++
    const name = `Untitled ${n}`
    const now = Date.now()
    const id = await gearPlannerDb.gearSetups.add({
      name,
      createdAt: now,
      updatedAt: now,
      setup: {},
      pinnedSlots: []
    })
    const newSetup: SavedGearSetup = {
      id: id as number,
      name,
      createdAt: now,
      updatedAt: now,
      setup: {},
      pinnedSlots: []
    }
    setSetups(prev => [...prev, newSetup])
    setActiveSetupId(id as number)
    saveActiveSetupId(id as number)
    return id as number
  }, [])

  const renameSetup = useCallback(async (id: number, name: string) => {
    await gearPlannerDb.gearSetups.update(id, { name, updatedAt: Date.now() })
    setSetups(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }, [])

  const deleteSetup = useCallback(async (id: number) => {
    await gearPlannerDb.gearSetups.delete(id)
    const remaining = await gearPlannerDb.gearSetups.orderBy('updatedAt').reverse().toArray()

    if (remaining.length === 0) {
      const now = Date.now()
      const newId = await gearPlannerDb.gearSetups.add({
        name: 'Untitled 1',
        createdAt: now,
        updatedAt: now,
        setup: {},
        pinnedSlots: []
      })
      const defaultSetup: SavedGearSetup = {
        id: newId as number,
        name: 'Untitled 1',
        createdAt: now,
        updatedAt: now,
        setup: {},
        pinnedSlots: []
      }
      setSetups([defaultSetup])
      setActiveSetupId(newId as number)
      saveActiveSetupId(newId as number)
    } else {
      setSetups(remaining)
      if (id === activeSetupIdRef.current) {
        const newActive = remaining[0].id!
        setActiveSetupId(newActive)
        saveActiveSetupId(newActive)
      }
    }
  }, [])

  const saveCurrentSetup = useCallback(async (
    setup: GearSetup,
    craftingSelections?: GearCraftingSelections,
    pinnedSlots?: Set<string>
  ) => {
    const currentId = activeSetupIdRef.current
    if (currentId === null) return
    const now = Date.now()
    const serializedSetup = serializeSetup(setup)
    const serializedCrafting = serializeCrafting(craftingSelections)
    const serializedPins = pinnedSlots ? Array.from(pinnedSlots) : []

    await gearPlannerDb.gearSetups.update(currentId, {
      setup: serializedSetup,
      craftingSelections: serializedCrafting,
      pinnedSlots: serializedPins,
      updatedAt: now
    })

    setSetups(prev => prev.map(s => s.id === currentId ? {
      ...s,
      setup: serializedSetup,
      craftingSelections: serializedCrafting,
      pinnedSlots: serializedPins,
      updatedAt: now
    } : s))
  }, [])

  const loadSetupData = useCallback(async (
    id: number,
    items: Item[],
    craftingData: CraftingData | null
  ): Promise<LoadedSetupData | null> => {
    const saved = await gearPlannerDb.gearSetups.get(id)
    if (!saved) return null

    const setup = deserializeSetup(saved.setup, items)
    const craftingSelections = deserializeCrafting(saved.craftingSelections, craftingData, setup)
    const pinnedSlots = new Set(saved.pinnedSlots ?? [])

    return { setup, craftingSelections, pinnedSlots }
  }, [])

  return {
    setups,
    activeSetupId,
    isLoaded,
    selectSetup,
    createSetup,
    renameSetup,
    deleteSetup,
    saveCurrentSetup,
    loadSetupData
  }
}
