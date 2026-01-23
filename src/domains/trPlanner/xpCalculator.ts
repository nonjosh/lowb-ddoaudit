/**
 * XP Calculator for DDO TR Planner
 *
 * Calculates total XP earned from a quest based on base XP and configured bonuses.
 * See /src/docs/ddo-xp-mechanics.md for detailed documentation.
 */

/**
 * Configuration for XP bonus modifiers
 */
export interface XPBonusConfig {
  // Additive bonuses (% of base XP)
  firstTimeCompletion: 'none' | 'casual' | 'normal' | 'hard' | 'elite' | 'reaper'
  delvingBonus: 'none' | 'half' | 'full' // none=0%, half=75%, full=150%
  groupBonusPlayers: number // 0-11 other players
  conquest: boolean // 25%
  ingeniousDebilitation: boolean // 30%
  ransackBonus: boolean // 15%
  persistenceBonus: boolean // 10%
  flawlessVictory: boolean // 10%
  tomeOfLearning: 'none' | 'lesser' | 'greater' // 25% or 50% for heroic first-time
  dailyBonus: boolean // 25% heroic, 40% epic

  // Multiplicative bonuses (% of subtotal)
  voiceOfTheMaster: boolean // 5%
  shipBuff: boolean // 5%
  xpElixir: 0 | 10 | 20 | 30 | 50 // percentage
  vipBonus: boolean // 10%
  vipGroupBonus: boolean // 1% per player, max 5% party / 11% raid
}

/**
 * Quest XP data structure from API
 */
export interface QuestXPData {
  heroic_casual: number | null
  heroic_normal: number | null
  heroic_hard: number | null
  heroic_elite: number | null
  epic_casual: number | null
  epic_normal: number | null
  epic_hard: number | null
  epic_elite: number | null
}

export type Difficulty = 'casual' | 'normal' | 'hard' | 'elite' | 'reaper'
export type QuestTier = 'heroic' | 'epic'

/**
 * Default bonus configuration for an optimal TR run
 */
export const DEFAULT_BONUS_CONFIG: XPBonusConfig = {
  firstTimeCompletion: 'reaper',
  delvingBonus: 'full',
  groupBonusPlayers: 0,
  conquest: true,
  ingeniousDebilitation: false,
  ransackBonus: true,
  persistenceBonus: true,
  flawlessVictory: true,
  tomeOfLearning: 'greater',
  dailyBonus: true,
  voiceOfTheMaster: true,
  shipBuff: true,
  xpElixir: 0,
  vipBonus: true,
  vipGroupBonus: false,
}

/**
 * First-time difficulty completion bonus percentages
 */
const FIRST_TIME_BONUS: Record<XPBonusConfig['firstTimeCompletion'], number> = {
  none: 0,
  casual: 0.20,
  normal: 0.20,
  hard: 0.20,
  elite: 0.45,
  reaper: 0.45,
}

/**
 * Delving bonus percentages
 */
const DELVING_BONUS: Record<XPBonusConfig['delvingBonus'], number> = {
  none: 0,
  half: 0.75, // Character over-level but still eligible
  full: 1.50, // All characters within level range
}

/**
 * Tome of Learning first-time bonus percentages (heroic)
 */
const TOME_HEROIC_FIRST_TIME: Record<XPBonusConfig['tomeOfLearning'], number> = {
  none: 0,
  lesser: 0.25,
  greater: 0.50,
}

/**
 * Tome of Learning first-time bonus percentages (epic)
 */
const TOME_EPIC_FIRST_TIME: Record<XPBonusConfig['tomeOfLearning'], number> = {
  none: 0,
  lesser: 0.15,
  greater: 0.25,
}

/**
 * Get base XP from quest data for a given tier and difficulty
 */
export function getBaseXP(
  xpData: QuestXPData,
  tier: QuestTier,
  difficulty: Difficulty
): number | null {
  // Reaper uses Elite XP values
  const effectiveDifficulty = difficulty === 'reaper' ? 'elite' : difficulty
  const key = `${tier}_${effectiveDifficulty}` as keyof QuestXPData
  const value = xpData[key]

  if (value === null || value === undefined) return null
  return typeof value === 'string' ? parseInt(value, 10) : value
}

/**
 * Calculate all additive bonuses as a percentage of base XP
 */
export function calculateAdditiveBonusPercentage(
  config: XPBonusConfig,
  tier: QuestTier,
  isRaid: boolean
): number {
  let total = 0

  // First-time difficulty completion
  total += FIRST_TIME_BONUS[config.firstTimeCompletion]

  // Delving bonus
  total += DELVING_BONUS[config.delvingBonus]

  // Group bonus (event bonus - usually 0 unless Buddy Weekend)
  // For raids: 5% per player (max 55%)
  // For quests: 10% per player (max 50%)
  // We'll assume this is 0 for normal planning
  // If vipGroupBonus is enabled, use the VIP group bonus instead
  if (config.vipGroupBonus && config.groupBonusPlayers > 0) {
    const maxBonus = isRaid ? 0.11 : 0.05
    total += Math.min(config.groupBonusPlayers * 0.01, maxBonus)
  }

  // Party quest modifiers
  if (config.conquest) total += 0.25
  if (config.ingeniousDebilitation) total += 0.30
  if (config.ransackBonus) total += 0.15
  if (config.persistenceBonus) total += 0.10
  if (config.flawlessVictory) total += 0.10

  // Tome of Learning (first-time bonus)
  if (tier === 'heroic') {
    total += TOME_HEROIC_FIRST_TIME[config.tomeOfLearning]
  } else {
    total += TOME_EPIC_FIRST_TIME[config.tomeOfLearning]
  }

  // Daily bonus
  if (config.dailyBonus) {
    total += tier === 'heroic' ? 0.25 : 0.40
  }

  return total
}

/**
 * Calculate all multiplicative bonuses as a percentage of subtotal
 */
export function calculateMultiplicativeBonusPercentage(config: XPBonusConfig): number {
  let total = 0

  if (config.voiceOfTheMaster) total += 0.05
  if (config.shipBuff) total += 0.05
  total += config.xpElixir / 100
  if (config.vipBonus) total += 0.10

  return total
}

/**
 * Calculate total XP from a quest
 */
export function calculateQuestXP(
  baseXP: number,
  config: XPBonusConfig,
  tier: QuestTier,
  isRaid: boolean = false
): {
  baseXP: number
  additiveBonus: number
  subtotal: number
  multiplicativeBonus: number
  totalXP: number
  bonusPercentage: number
} {
  const additivePercentage = calculateAdditiveBonusPercentage(config, tier, isRaid)
  const additiveBonus = Math.floor(baseXP * additivePercentage)
  const subtotal = baseXP + additiveBonus

  const multiplicativePercentage = calculateMultiplicativeBonusPercentage(config)
  const multiplicativeBonus = Math.floor(subtotal * multiplicativePercentage)

  const totalXP = subtotal + multiplicativeBonus
  const bonusPercentage = totalXP / baseXP

  return {
    baseXP,
    additiveBonus,
    subtotal,
    multiplicativeBonus,
    totalXP,
    bonusPercentage,
  }
}

/**
 * Calculate XP with over-level penalty applied (Heroic only)
 */
export function applyOverLevelPenalty(
  xp: number,
  characterLevel: number,
  questLevel: number,
  tier: QuestTier
): number {
  // Epic/Legendary quests or high-level heroic quests don't have over-level penalty
  if (tier === 'epic' || questLevel >= 20) {
    return xp
  }

  const levelDiff = characterLevel - questLevel

  if (levelDiff <= 1) return xp
  if (levelDiff === 2) return Math.floor(xp * 0.90)
  if (levelDiff === 3) return Math.floor(xp * 0.75)
  if (levelDiff === 4) return Math.floor(xp * 0.50)
  if (levelDiff === 5) return Math.floor(xp * 0.25)
  if (levelDiff === 6) return Math.floor(xp * 0.01)
  return 0 // +7 or more: no XP
}

/**
 * Calculate full XP for a quest including potential over-level penalty
 */
export function calculateFullQuestXP(
  xpData: QuestXPData,
  config: XPBonusConfig,
  tier: QuestTier,
  difficulty: Difficulty,
  characterLevel: number,
  questLevel: number,
  isRaid: boolean = false
): {
  baseXP: number
  totalXP: number
  penalizedXP: number
  overLevelPenalty: number
} | null {
  const baseXP = getBaseXP(xpData, tier, difficulty)
  if (baseXP === null) return null

  const result = calculateQuestXP(baseXP, config, tier, isRaid)

  const penalizedXP = applyOverLevelPenalty(result.totalXP, characterLevel, questLevel, tier)
  const overLevelPenalty = result.totalXP > 0 ? (result.totalXP - penalizedXP) / result.totalXP : 0

  return {
    baseXP,
    totalXP: result.totalXP,
    penalizedXP,
    overLevelPenalty,
  }
}

/**
 * Format XP number with thousands separator
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString()
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}
