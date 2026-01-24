import { createContext, useContext } from 'react'

import { PlanMode, TRTier } from '@/domains/trPlanner/levelRequirements'
import { XPBonusConfig } from '@/domains/trPlanner/xpCalculator'
import { TRPlan } from '@/storage/trPlannerDb'

/**
 * Quest data with XP information
 */
export interface QuestWithXP {
  id: string
  name: string
  heroicCR: number | null
  epicCR: number | null
  pack: string | null
  patron: string | null
  groupSize: 'Solo' | 'Party' | 'Raid'
  length: number | null
  xp: {
    heroic_casual: number | null
    heroic_normal: number | null
    heroic_hard: number | null
    heroic_elite: number | null
    epic_casual: number | null
    epic_normal: number | null
    epic_hard: number | null
    epic_elite: number | null
  }
}

/**
 * Adventure pack grouping
 */
export interface AdventurePack {
  name: string
  quests: QuestWithXP[]
  minLevel: number | null
  maxLevel: number | null
  isFreeToVIP: boolean
}

/**
 * TR Planner context state
 */
export interface TRPlannerState {
  // Current plan state
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuestIds: Set<string>
  selectedPackNames: Set<string>
  completedQuestIds: Set<string> // Track completed quests
  startLevel: number // Starting level for the plan
  selectedCharacterIds: Set<string> // Selected character IDs for level markers
  sagaFilter: string[] // Currently selected saga filters

  // Saved plans
  savedPlans: TRPlan[]
  currentPlanId: number | null
  currentPlanName: string

  // Quest data
  quests: QuestWithXP[]
  packs: AdventurePack[]
  loading: boolean
  error: string | null
}

/**
 * TR Planner context actions
 */
export interface TRPlannerActions {
  // Mode and settings
  setMode: (mode: PlanMode) => void
  setTRTier: (tier: TRTier) => void
  setBonuses: (bonuses: XPBonusConfig) => void
  updateBonus: <K extends keyof XPBonusConfig>(key: K, value: XPBonusConfig[K]) => void
  setStartLevel: (level: number) => void

  // Quest selection
  toggleQuest: (questId: string) => void
  togglePack: (packName: string, filteredQuestIds?: string[]) => void
  selectQuests: (questIds: string[]) => void
  deselectQuests: (questIds: string[]) => void
  clearSelection: () => void

  // Quest completion tracking
  toggleQuestCompletion: (questId: string) => void
  markQuestsCompleted: (questIds: string[]) => void
  markQuestsIncomplete: (questIds: string[]) => void

  // Saga filter management
  setSagaFilter: (sagas: string[]) => void
  toggleSagaFilter: (sagaName: string) => void

  // Character selection for level markers
  toggleCharacter: (characterId: string) => void
  clearCharacters: () => void

  // Plan management
  newPlan: () => void
  savePlan: (name?: string) => Promise<void>
  loadPlan: (id: number) => Promise<void>
  deletePlan: (id: number) => Promise<void>
  duplicatePlan: (id: number, newName: string) => Promise<void>
  setPlanName: (name: string) => void

  // Data loading
  refreshQuests: () => Promise<void>
}

export type TRPlannerContextValue = TRPlannerState & TRPlannerActions

export const TRPlannerContext = createContext<TRPlannerContextValue | null>(null)

export function useTRPlanner(): TRPlannerContextValue {
  const context = useContext(TRPlannerContext)
  if (!context) {
    throw new Error('useTRPlanner must be used within a TRPlannerProvider')
  }
  return context
}
