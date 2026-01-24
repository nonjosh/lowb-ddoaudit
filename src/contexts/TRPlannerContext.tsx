import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { PlanMode, TRTier } from '@/domains/trPlanner/levelRequirements'
import { DEFAULT_BONUS_CONFIG, XPBonusConfig } from '@/domains/trPlanner/xpCalculator'
import {
  createTRPlan,
  deleteTRPlan as deleteStoredPlan,
  duplicateTRPlan as duplicateStoredPlan,
  getAllTRPlans,
  getTRPlanById,
  updateTRPlan,
} from '@/storage/trPlannerDb'

import {
  AdventurePack,
  QuestWithXP,
  TRPlannerContext,
  TRPlannerContextValue,
  TRPlannerState,
} from './useTRPlanner'

const DDOAUDIT_QUESTS_URL = 'https://api.ddoaudit.com/v1/quests'
const AREAS_URL = '/lowb-ddoaudit/data/areas.json'
const STORAGE_KEY = 'trPlannerSelection'

interface TRPlannerProviderProps {
  children: ReactNode
}

/**
 * Load areas data and return set of wilderness area IDs
 */
async function loadWildernessAreaIds(): Promise<Set<number>> {
  try {
    const response = await fetch(AREAS_URL)
    if (!response.ok) {
      console.warn('Failed to load areas.json, wilderness filtering disabled')
      return new Set()
    }
    const areasData = (await response.json()) as { data: Array<{ id: number; is_wilderness: boolean }> }
    const wildernessIds = new Set<number>()
    for (const area of areasData.data) {
      if (area.is_wilderness) {
        wildernessIds.add(area.id)
      }
    }
    return wildernessIds
  } catch (err) {
    console.warn('Error loading areas data:', err)
    return new Set()
  }
}

/**
 * Parse quest data from DDO Audit API
 */
function parseQuestData(data: unknown[], wildernessAreaIds: Set<number>): QuestWithXP[] {
  return data
    .filter((q: unknown) => {
      // Filter out quests that have no ID or name
      const quest = q as Record<string, unknown>
      if (!quest.id || !quest.name) return false

      // Filter out wilderness quests by checking area_id
      const areaId = typeof quest.area_id === 'number' ? quest.area_id : null
      if (areaId !== null && wildernessAreaIds.has(areaId)) {
        return false
      }

      return true
    })
    .map((q: unknown) => {
      const quest = q as Record<string, unknown>
      const xp = quest.xp as Record<string, unknown> | undefined

      return {
        id: String(quest.id ?? ''),
        name: String(quest.name ?? ''),
        heroicCR: typeof quest.heroic_normal_cr === 'number' ? quest.heroic_normal_cr : null,
        epicCR: typeof quest.epic_normal_cr === 'number' ? quest.epic_normal_cr : null,
        pack: typeof quest.required_adventure_pack === 'string' ? quest.required_adventure_pack : null,
        patron: typeof quest.patron === 'string' ? quest.patron : null,
        groupSize: (quest.group_size as 'Solo' | 'Party' | 'Raid') ?? 'Party',
        length: typeof quest.length === 'number' ? quest.length : null,
        xp: {
          heroic_casual: parseXPValue(xp?.heroic_casual),
          heroic_normal: parseXPValue(xp?.heroic_normal),
          heroic_hard: parseXPValue(xp?.heroic_hard),
          heroic_elite: parseXPValue(xp?.heroic_elite),
          epic_casual: parseXPValue(xp?.epic_casual),
          epic_normal: parseXPValue(xp?.epic_normal),
          epic_hard: parseXPValue(xp?.epic_hard),
          epic_elite: parseXPValue(xp?.epic_elite),
        },
      }
    })
    .filter((q) => q.name && (q.heroicCR !== null || q.epicCR !== null))
}

function parseXPValue(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Group quests by adventure pack
 */
function groupQuestsByPack(quests: QuestWithXP[]): AdventurePack[] {
  const packMap = new Map<string, QuestWithXP[]>()

  for (const quest of quests) {
    const packName = quest.pack ?? 'Free to Play'
    if (!packMap.has(packName)) {
      packMap.set(packName, [])
    }
    packMap.get(packName)!.push(quest)
  }

  const packs: AdventurePack[] = []
  for (const [name, packQuests] of packMap) {
    const levels = packQuests
      .map((q) => q.heroicCR ?? q.epicCR)
      .filter((l): l is number => l !== null)

    packs.push({
      name,
      quests: packQuests.sort((a, b) => {
        const levelA = a.heroicCR ?? a.epicCR ?? 0
        const levelB = b.heroicCR ?? b.epicCR ?? 0
        return levelA - levelB
      }),
      minLevel: levels.length > 0 ? Math.min(...levels) : null,
      maxLevel: levels.length > 0 ? Math.max(...levels) : null,
      isFreeToVIP: name === 'Free to Play' || packQuests.some((q) => q.pack === null),
    })
  }

  return packs.sort((a, b) => {
    const minA = a.minLevel ?? 999
    const minB = b.minLevel ?? 999
    return minA - minB
  })
}

const initialState: TRPlannerState = {
  mode: 'epic',
  trTier: '1-3',
  bonuses: DEFAULT_BONUS_CONFIG,
  selectedQuestIds: new Set(),
  selectedPackNames: new Set(),
  completedQuestIds: new Set(),
  startLevel: 20, // Default to 20 for epic mode
  selectedCharacterIds: new Set(),
  sagaFilter: [],
  savedPlans: [],
  currentPlanId: null,
  currentPlanName: 'New Plan',
  quests: [],
  packs: [],
  loading: false,
  error: null,
}

interface PersistedSelection {
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuestIds: string[]
  selectedPackNames: string[]
  completedQuestIds: string[]
  startLevel: number
  selectedCharacterIds: string[]
  sagaFilter: string[]
  currentPlanName: string
}

function loadPersistedSelection(): Partial<TRPlannerState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as PersistedSelection
    return {
      mode: parsed.mode,
      trTier: parsed.trTier,
      bonuses: parsed.bonuses,
      selectedQuestIds: new Set(parsed.selectedQuestIds),
      selectedPackNames: new Set(parsed.selectedPackNames),
      completedQuestIds: new Set(parsed.completedQuestIds ?? []),
      startLevel: parsed.startLevel,
      selectedCharacterIds: new Set(parsed.selectedCharacterIds),
      sagaFilter: parsed.sagaFilter ?? [],
      currentPlanName: parsed.currentPlanName,
    }
  } catch (err) {
    console.warn('Failed to load persisted TR planner selection:', err)
    return null
  }
}

function savePersistedSelection(state: TRPlannerState): void {
  try {
    const toStore: PersistedSelection = {
      mode: state.mode,
      trTier: state.trTier,
      bonuses: state.bonuses,
      selectedQuestIds: Array.from(state.selectedQuestIds),
      selectedPackNames: Array.from(state.selectedPackNames),
      completedQuestIds: Array.from(state.completedQuestIds),
      startLevel: state.startLevel,
      selectedCharacterIds: Array.from(state.selectedCharacterIds),
      sagaFilter: state.sagaFilter,
      currentPlanName: state.currentPlanName,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch (err) {
    console.warn('Failed to save TR planner selection:', err)
  }
}

export function TRPlannerProvider({ children }: TRPlannerProviderProps) {
  const [state, setState] = useState<TRPlannerState>(() => {
    // Try to restore persisted selection on initial load
    const persisted = loadPersistedSelection()
    if (persisted) {
      return { ...initialState, ...persisted }
    }
    return initialState
  })

  // Load saved plans on mount
  useEffect(() => {
    void loadSavedPlans()
  }, [])

  // Persist selection to localStorage when it changes
  const stateRef = useRef(state)
  stateRef.current = state
  useEffect(() => {
    savePersistedSelection(stateRef.current)
  }, [state.mode, state.trTier, state.bonuses, state.selectedQuestIds, state.selectedPackNames, state.completedQuestIds, state.startLevel, state.selectedCharacterIds, state.sagaFilter, state.currentPlanName])

  const loadSavedPlans = async () => {
    try {
      const plans = await getAllTRPlans()
      setState((prev) => ({ ...prev, savedPlans: plans }))
    } catch (error) {
      console.error('Failed to load saved plans:', error)
    }
  }

  const refreshQuests = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Load wilderness area IDs first
      const wildernessAreaIds = await loadWildernessAreaIds()

      const response = await fetch(DDOAUDIT_QUESTS_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch quests: ${response.status}`)
      }

      const json = await response.json()
      const data = Array.isArray(json) ? json : json.data ?? []
      const quests = parseQuestData(data, wildernessAreaIds)
      const packs = groupQuestsByPack(quests)

      setState((prev) => ({
        ...prev,
        quests,
        packs,
        loading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch quests:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (error as Error).message ?? 'Failed to load quest data',
      }))
    }
  }, [])

  // Actions
  const setMode = useCallback((mode: PlanMode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  const setTRTier = useCallback((trTier: TRTier) => {
    setState((prev) => ({ ...prev, trTier }))
  }, [])

  const setBonuses = useCallback((bonuses: XPBonusConfig) => {
    setState((prev) => ({ ...prev, bonuses }))
  }, [])

  const updateBonus = useCallback(<K extends keyof XPBonusConfig>(key: K, value: XPBonusConfig[K]) => {
    setState((prev) => ({
      ...prev,
      bonuses: { ...prev.bonuses, [key]: value },
    }))
  }, [])

  const setStartLevel = useCallback((level: number) => {
    setState((prev) => ({ ...prev, startLevel: level }))
  }, [])

  const toggleQuest = useCallback((questId: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedQuestIds)
      if (newSelected.has(questId)) {
        newSelected.delete(questId)
      } else {
        newSelected.add(questId)
      }
      return { ...prev, selectedQuestIds: newSelected }
    })
  }, [])

  const togglePack = useCallback((packName: string, filteredQuestIds?: string[]) => {
    setState((prev) => {
      const pack = prev.packs.find((p) => p.name === packName)
      if (!pack) return prev

      const newSelectedPacks = new Set(prev.selectedPackNames)
      const newSelectedQuests = new Set(prev.selectedQuestIds)
      // Use filtered quest IDs if provided, otherwise use all pack quests
      const packQuestIds = filteredQuestIds ?? pack.quests.map((q) => q.id)

      // Check if any of the filtered quests are selected
      const hasSelectedQuests = packQuestIds.some((id) => newSelectedQuests.has(id))

      if (hasSelectedQuests) {
        // Deselect all filtered quests
        for (const id of packQuestIds) {
          newSelectedQuests.delete(id)
        }
        // Check if any quests from this pack are still selected
        const anyStillSelected = pack.quests.some((q) => newSelectedQuests.has(q.id))
        if (!anyStillSelected) {
          newSelectedPacks.delete(packName)
        }
      } else {
        // Select all filtered quests
        newSelectedPacks.add(packName)
        for (const id of packQuestIds) {
          newSelectedQuests.add(id)
        }
      }

      return {
        ...prev,
        selectedPackNames: newSelectedPacks,
        selectedQuestIds: newSelectedQuests,
      }
    })
  }, [])

  const selectQuests = useCallback((questIds: string[]) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedQuestIds)
      for (const id of questIds) {
        newSelected.add(id)
      }
      return { ...prev, selectedQuestIds: newSelected }
    })
  }, [])

  const deselectQuests = useCallback((questIds: string[]) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedQuestIds)
      for (const id of questIds) {
        newSelected.delete(id)
      }
      return { ...prev, selectedQuestIds: newSelected }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedQuestIds: new Set(),
      selectedPackNames: new Set(),
    }))
  }, [])

  // Quest completion tracking
  const toggleQuestCompletion = useCallback((questId: string) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedQuestIds)
      if (newCompleted.has(questId)) {
        newCompleted.delete(questId)
      } else {
        newCompleted.add(questId)
      }
      return { ...prev, completedQuestIds: newCompleted }
    })
  }, [])

  const markQuestsCompleted = useCallback((questIds: string[]) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedQuestIds)
      for (const id of questIds) {
        newCompleted.add(id)
      }
      return { ...prev, completedQuestIds: newCompleted }
    })
  }, [])

  const markQuestsIncomplete = useCallback((questIds: string[]) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedQuestIds)
      for (const id of questIds) {
        newCompleted.delete(id)
      }
      return { ...prev, completedQuestIds: newCompleted }
    })
  }, [])

  // Saga filter management
  const setSagaFilter = useCallback((sagas: string[]) => {
    setState((prev) => ({ ...prev, sagaFilter: sagas }))
  }, [])

  const toggleSagaFilter = useCallback((sagaName: string) => {
    setState((prev) => {
      const newFilter = prev.sagaFilter.includes(sagaName)
        ? prev.sagaFilter.filter((s) => s !== sagaName)
        : [...prev.sagaFilter, sagaName]
      return { ...prev, sagaFilter: newFilter }
    })
  }, [])

  const toggleCharacter = useCallback((characterId: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedCharacterIds)
      if (newSelected.has(characterId)) {
        newSelected.delete(characterId)
      } else {
        newSelected.add(characterId)
      }
      return { ...prev, selectedCharacterIds: newSelected }
    })
  }, [])

  const clearCharacters = useCallback(() => {
    setState((prev) => ({ ...prev, selectedCharacterIds: new Set() }))
  }, [])

  const newPlan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'heroic',
      trTier: '1-3',
      bonuses: DEFAULT_BONUS_CONFIG,
      selectedQuestIds: new Set(),
      selectedPackNames: new Set(),
      completedQuestIds: new Set(),
      startLevel: 1,
      selectedCharacterIds: new Set(),
      sagaFilter: [],
      currentPlanId: null,
      currentPlanName: 'New Plan',
    }))
  }, [])

  const savePlan = useCallback(async (name?: string) => {
    const planName = name ?? state.currentPlanName

    const planData = {
      name: planName,
      mode: state.mode,
      trTier: state.trTier,
      bonuses: state.bonuses,
      selectedQuestIds: Array.from(state.selectedQuestIds),
      selectedPackNames: Array.from(state.selectedPackNames),
    }

    try {
      if (state.currentPlanId !== null) {
        await updateTRPlan(state.currentPlanId, planData)
      } else {
        const newId = await createTRPlan(planData)
        setState((prev) => ({ ...prev, currentPlanId: newId, currentPlanName: planName }))
      }

      await loadSavedPlans()
    } catch (error) {
      console.error('Failed to save plan:', error)
      throw error
    }
  }, [state])

  const loadPlan = useCallback(async (id: number) => {
    try {
      const plan = await getTRPlanById(id)
      if (!plan) {
        throw new Error('Plan not found')
      }

      setState((prev) => ({
        ...prev,
        mode: plan.mode,
        trTier: plan.trTier,
        bonuses: plan.bonuses,
        selectedQuestIds: new Set(plan.selectedQuestIds),
        selectedPackNames: new Set(plan.selectedPackNames),
        currentPlanId: plan.id ?? null,
        currentPlanName: plan.name,
      }))
    } catch (error) {
      console.error('Failed to load plan:', error)
      throw error
    }
  }, [])

  const deletePlan = useCallback(async (id: number) => {
    try {
      await deleteStoredPlan(id)

      // If we deleted the current plan, reset to new
      if (state.currentPlanId === id) {
        newPlan()
      }

      await loadSavedPlans()
    } catch (error) {
      console.error('Failed to delete plan:', error)
      throw error
    }
  }, [state.currentPlanId, newPlan])

  const duplicatePlan = useCallback(async (id: number, newName: string) => {
    try {
      await duplicateStoredPlan(id, newName)
      await loadSavedPlans()
    } catch (error) {
      console.error('Failed to duplicate plan:', error)
      throw error
    }
  }, [])

  const setPlanName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, currentPlanName: name }))
  }, [])

  const value: TRPlannerContextValue = {
    ...state,
    setMode,
    setTRTier,
    setBonuses,
    updateBonus,
    setStartLevel,
    toggleQuest,
    togglePack,
    selectQuests,
    deselectQuests,
    clearSelection,
    toggleQuestCompletion,
    markQuestsCompleted,
    markQuestsIncomplete,
    setSagaFilter,
    toggleSagaFilter,
    toggleCharacter,
    clearCharacters,
    newPlan,
    savePlan,
    loadPlan,
    deletePlan,
    duplicatePlan,
    setPlanName,
    refreshQuests,
  }

  return <TRPlannerContext.Provider value={value}>{children}</TRPlannerContext.Provider>
}
