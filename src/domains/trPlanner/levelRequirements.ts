/**
 * Level Requirements for DDO TR Planner
 *
 * XP requirements per level/rank based on TR count.
 * See /src/docs/ddo-xp-mechanics.md for detailed documentation.
 */

export type TRTier = '1-3' | '4-7' | '8+'
export type PlanMode = 'heroic' | 'epic' | 'etr'

/**
 * Heroic XP requirements per rank (base, lives 1-3)
 * Each level has 5 ranks (ranks 1-5 for level 1, ranks 6-10 for level 2, etc.)
 */
const HEROIC_XP_BASE: number[] = [
  // Level 1 (ranks 1-5)
  0, 800, 1600, 2400, 3200,
  // Level 2 (ranks 6-10)
  4000, 6400, 8800, 11200, 13600,
  // Level 3 (ranks 11-15)
  16000, 20800, 25600, 30400, 35200,
  // Level 4 (ranks 16-20)
  40000, 46400, 52800, 59200, 65600,
  // Level 5 (ranks 21-25)
  72000, 80000, 88000, 96000, 104000,
  // Level 6 (ranks 26-30)
  112000, 121600, 131200, 140800, 150400,
  // Level 7 (ranks 31-35)
  160000, 173000, 186000, 199000, 212000,
  // Level 8 (ranks 36-40)
  225000, 241000, 257000, 273000, 289000,
  // Level 9 (ranks 41-45)
  305000, 324000, 343000, 362000, 381000,
  // Level 10 (ranks 46-50)
  400000, 422000, 444000, 466000, 488000,
  // Level 11 (ranks 51-55)
  510000, 534000, 558000, 582000, 606000,
  // Level 12 (ranks 56-60)
  630000, 656000, 682000, 708000, 734000,
  // Level 13 (ranks 61-65)
  760000, 788000, 816000, 844000, 872000,
  // Level 14 (ranks 66-70)
  900000, 930000, 960000, 990000, 1020000,
  // Level 15 (ranks 71-75)
  1050000, 1082000, 1114000, 1146000, 1178000,
  // Level 16 (ranks 76-80)
  1210000, 1243000, 1276000, 1309000, 1342000,
  // Level 17 (ranks 81-85)
  1375000, 1409000, 1443000, 1477000, 1511000,
  // Level 18 (ranks 86-90)
  1545000, 1580000, 1615000, 1650000, 1685000,
  // Level 19 (ranks 91-95)
  1720000, 1756000, 1792000, 1828000, 1864000,
  // Level 20 (rank 96 = cap)
  1900000,
]

/**
 * Epic XP requirements (does not change based on TR count)
 * Level 20 starts at 0 epic XP, each level has 5 ranks
 */
const EPIC_XP_REQUIREMENTS: number[] = [
  // Level 20 (ranks 0-4)
  0, 120000, 240000, 360000, 480000,
  // Level 21 (ranks 5-9)
  600000, 730000, 860000, 990000, 1120000,
  // Level 22 (ranks 10-14)
  1250000, 1390000, 1530000, 1670000, 1810000,
  // Level 23 (ranks 15-19)
  1950000, 2100000, 2250000, 2400000, 2550000,
  // Level 24 (ranks 20-24)
  2700000, 2860000, 3020000, 3180000, 3340000,
  // Level 25 (ranks 25-29)
  3500000, 3670000, 3840000, 4010000, 4180000,
  // Level 26 (ranks 30-34)
  4350000, 4530000, 4710000, 4890000, 5070000,
  // Level 27 (ranks 35-39)
  5250000, 5440000, 5630000, 5820000, 6010000,
  // Level 28 (ranks 40-44)
  6200000, 6400000, 6600000, 6800000, 7000000,
  // Level 29 (ranks 45-49)
  7200000, 7410000, 7620000, 7830000, 8040000,
  // Level 30 (rank 50 = cap)
  8250000,
]

/**
 * Get TR multiplier based on TR count
 */
export function getTRMultiplier(trTier: TRTier): number {
  switch (trTier) {
    case '1-3':
      return 1.0
    case '4-7':
      return 1.5
    case '8+':
      return 2.0
  }
}

/**
 * Get XP required to reach a specific rank in Heroic mode
 * @param rank - Rank number (1-96 for levels 1-20)
 * @param trTier - TR tier for scaling
 * @returns Total XP required to reach this rank
 */
export function getHeroicXPForRank(rank: number, trTier: TRTier): number {
  if (rank < 1 || rank > 96) return 0
  const baseXP = HEROIC_XP_BASE[rank - 1] ?? 0
  return Math.floor(baseXP * getTRMultiplier(trTier))
}

/**
 * Get XP required to reach a specific rank in Epic mode
 * @param rank - Rank number (0-50 for levels 20-30)
 * @returns Total XP required to reach this rank
 */
export function getEpicXPForRank(rank: number): number {
  if (rank < 0 || rank > 50) return 0
  return EPIC_XP_REQUIREMENTS[rank] ?? 0
}

/**
 * Convert rank to level
 */
export function rankToLevel(rank: number, mode: PlanMode): number {
  if (mode === 'heroic') {
    if (rank <= 0) return 1
    if (rank >= 96) return 20
    return Math.floor((rank - 1) / 5) + 1
  } else {
    if (rank <= 0) return 20
    if (rank >= 50) return 30
    return Math.floor(rank / 5) + 20
  }
}

/**
 * Convert level to starting rank
 */
export function levelToStartRank(level: number, mode: PlanMode): number {
  if (mode === 'heroic') {
    if (level < 1) return 1
    if (level > 20) return 96
    return (level - 1) * 5 + 1
  } else {
    if (level < 20) return 0
    if (level > 30) return 50
    return (level - 20) * 5
  }
}

/**
 * Convert total rank to within-level rank (0-4)
 * In DDO, each level has 5 ranks numbered 0-4. This converts the
 * cumulative rank to the rank displayed in-game for that level.
 */
export function rankToWithinLevelRank(rank: number, mode: PlanMode): number {
  if (mode === 'heroic') {
    if (rank <= 0) return 0
    if (rank >= 96) return 0 // At cap
    return (rank - 1) % 5
  } else {
    if (rank < 0) return 0
    if (rank >= 50) return 0 // At cap
    return rank % 5
  }
}

/**
 * Convert cumulative rank to DDO's display rank for epic levels.
 * DDO displays epic ranks as 1-40, where:
 * - Level 20 ranks 1-4 = display ranks 1-4
 * - Level 21 ranks 1-4 = display ranks 5-8
 * - ...
 * - Level 29 ranks 1-4 = display ranks 37-40
 * - Level 30 = display rank 40 (cap)
 *
 * Note: Internal cumulative ranks are 0-50, but display uses 1-40.
 */
export function rankToDisplayRank(rank: number, mode: PlanMode): number {
  if (mode === 'heroic') {
    // For heroic, just return the cumulative rank (1-96)
    return rank
  } else {
    // For epic/etr, convert to DDO's 1-40 display format
    if (rank <= 0) return 0
    if (rank >= 50) return 40 // Cap

    const level = rankToLevel(rank, mode)
    const withinLevelRank = rank % 5 // 0-4

    // Convert to display: (level - 20) * 4 + withinLevelRank
    // But withinLevelRank 0 means we just leveled up, so display as previous level's rank 4
    if (withinLevelRank === 0) {
      // Just hit this level, display as previous level's max rank
      return Math.max(0, (level - 20) * 4)
    } else {
      // Within level ranks 1-4 map to display ranks
      return (level - 20) * 4 + withinLevelRank
    }
  }
}

/**
 * Get XP required for a specific level range
 */
export function getXPForLevelRange(
  startLevel: number,
  endLevel: number,
  mode: PlanMode,
  trTier: TRTier = '1-3'
): number {
  const startRank = levelToStartRank(startLevel, mode)
  const endRank = levelToStartRank(endLevel, mode)

  if (mode === 'heroic') {
    return getHeroicXPForRank(endRank, trTier) - getHeroicXPForRank(startRank, trTier)
  } else {
    return getEpicXPForRank(endRank) - getEpicXPForRank(startRank)
  }
}

/**
 * Get total XP required for full heroic progression (1-20)
 */
export function getTotalHeroicXP(trTier: TRTier): number {
  return getHeroicXPForRank(96, trTier)
}

/**
 * Get total XP required for full epic progression (20-30)
 */
export function getTotalEpicXP(): number {
  return getEpicXPForRank(50)
}

/**
 * Find the rank that a given XP amount reaches
 */
export function xpToRank(xp: number, mode: PlanMode, trTier: TRTier = '1-3'): number {
  const requirements = mode === 'heroic' ? HEROIC_XP_BASE : EPIC_XP_REQUIREMENTS
  const multiplier = mode === 'heroic' ? getTRMultiplier(trTier) : 1

  for (let i = requirements.length - 1; i >= 0; i--) {
    const required = Math.floor(requirements[i] * multiplier)
    if (xp >= required) {
      return mode === 'heroic' ? i + 1 : i
    }
  }
  return mode === 'heroic' ? 1 : 0
}

/**
 * Calculate how many ranks a given XP amount covers starting from a given rank
 */
export function calculateRanksCovered(
  xp: number,
  startRank: number,
  mode: PlanMode,
  trTier: TRTier = '1-3'
): number {
  const startXP =
    mode === 'heroic' ? getHeroicXPForRank(startRank, trTier) : getEpicXPForRank(startRank)
  const endXP = startXP + xp
  const endRank = xpToRank(endXP, mode, trTier)
  return endRank - startRank
}

/**
 * Generate level markers for the ruler
 */
export function getLevelMarkers(mode: PlanMode): { level: number; rank: number; label: string }[] {
  const markers: { level: number; rank: number; label: string }[] = []

  if (mode === 'heroic') {
    for (let level = 1; level <= 20; level++) {
      markers.push({
        level,
        rank: levelToStartRank(level, mode),
        label: `L${level}`,
      })
    }
  } else {
    for (let level = 20; level <= 30; level++) {
      markers.push({
        level,
        rank: levelToStartRank(level, mode),
        label: `L${level}`,
      })
    }
  }

  return markers
}

/**
 * Get the optimal quest level range for a character level
 * Heroic: quest level should be >= character level - 2
 * Epic: quest level should be >= character level - 4
 */
export function getOptimalQuestLevelRange(
  characterLevel: number,
  mode: PlanMode
): { min: number; max: number } {
  if (mode === 'heroic') {
    return {
      min: Math.max(1, characterLevel - 1), // Can be 1 level below
      max: characterLevel + 2, // Can be up to 2 levels above (for full delving)
    }
  } else {
    return {
      min: Math.max(20, characterLevel - 2), // Can be 2 levels below
      max: characterLevel + 4, // Can be up to 4 levels above
    }
  }
}

/**
 * Check if a quest level is optimal for a character level
 */
export function isQuestLevelOptimal(
  questLevel: number,
  characterLevel: number,
  mode: PlanMode
): boolean {
  const range = getOptimalQuestLevelRange(characterLevel, mode)
  return questLevel >= range.min && questLevel <= range.max
}
