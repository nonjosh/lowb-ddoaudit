import { ReactNode, useCallback, useEffect, useState } from 'react'

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

interface TRPlannerProviderProps {
  children: ReactNode
}

/**
 * Parse quest data from DDO Audit API
 */
function parseQuestData(data: unknown[]): QuestWithXP[] {
  return data
    .filter((q: unknown) => {
      // Filter out quests that have no ID or name
      const quest = q as Record<string, unknown>
      if (!quest.id || !quest.name) return false

      // Ignore placeholder quests where name equals pack name and no XP data
      // These are often just adventure pack headers in the raw data
      const name = String(quest.name)
      const pack = typeof quest.required_adventure_pack === 'string' ? quest.required_adventure_pack : null
      const xp = quest.xp as Record<string, unknown> | undefined

      // Check if XP object is empty or undefined
      const hasXP = xp && Object.values(xp).some((val) => val !== null && val !== undefined)

      if (pack && name === pack && !hasXP) {
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
  startLevel: 20, // Default to 20 for epic mode
  selectedCharacterIds: new Set(),
  savedPlans: [],
  currentPlanId: null,
  currentPlanName: 'New Plan',
  quests: [],
  packs: [],
  loading: false,
  error: null,
}

export function TRPlannerProvider({ children }: TRPlannerProviderProps) {
  const [state, setState] = useState<TRPlannerState>(initialState)

  // Load saved plans on mount
  useEffect(() => {
    void loadSavedPlans()
  }, [])

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
      const response = await fetch(DDOAUDIT_QUESTS_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch quests: ${response.status}`)
      }

      const json = await response.json()
      const data = Array.isArray(json) ? json : json.data ?? []
      const quests = parseQuestData(data)
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

  const togglePack = useCallback((packName: string) => {
    setState((prev) => {
      const pack = prev.packs.find((p) => p.name === packName)
      if (!pack) return prev

      const newSelectedPacks = new Set(prev.selectedPackNames)
      const newSelectedQuests = new Set(prev.selectedQuestIds)
      const packQuestIds = pack.quests.map((q) => q.id)

      if (newSelectedPacks.has(packName)) {
        // Deselect pack and all its quests
        newSelectedPacks.delete(packName)
        for (const id of packQuestIds) {
          newSelectedQuests.delete(id)
        }
      } else {
        // Select pack and all its quests
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
      startLevel: 1,
      selectedCharacterIds: new Set(),
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
