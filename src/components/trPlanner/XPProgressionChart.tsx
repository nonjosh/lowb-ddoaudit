import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo } from 'react'

import { QuestWithXP } from '@/contexts/useTRPlanner'
import {
  getHeroicXPForRank,
  getEpicXPForRank,
  getTotalHeroicXP,
  getTotalEpicXP,
  levelToStartRank,
  PlanMode,
  rankToLevel,
  TRTier,
  xpToRank,
} from '@/domains/trPlanner/levelRequirements'
import {
  calculateQuestXP,
  applyOverLevelPenalty,
  formatXP,
  getBaseXP,
  XPBonusConfig,
} from '@/domains/trPlanner/xpCalculator'

interface XPProgressionChartProps {
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuests: QuestWithXP[]
  startLevel?: number
}

interface ProgressionRow {
  packName: string
  questName: string | null // null for pack summary rows
  questLevel: number
  questXP: number
  cumulativeXP: number
  startLevel: number
  startRank: number
  endLevel: number
  endRank: number
  levelsGained: number
  isPackSummary: boolean
  isEstimated: boolean // true if XP is estimated (no data from API)
}

export default function XPProgressionChart({
  mode,
  trTier,
  bonuses,
  selectedQuests,
  startLevel: propStartLevel,
}: XPProgressionChartProps) {
  const theme = useTheme()

  // Default start level based on mode
  const startLevelDefault = propStartLevel ?? (mode === 'heroic' ? 1 : 20)

  const progressionData = useMemo(() => {
    const rows: ProgressionRow[] = []
    // Calculate starting XP based on start level
    const startRank = levelToStartRank(startLevelDefault, mode)
    const initialXP = mode === 'heroic'
      ? getHeroicXPForRank(startRank, trTier)
      : getEpicXPForRank(startRank)
    let cumulativeXP = initialXP

    // Group quests by pack
    const packMap = new Map<string, QuestWithXP[]>()
    for (const quest of selectedQuests) {
      const packName = quest.pack ?? 'Free to Play'
      if (!packMap.has(packName)) {
        packMap.set(packName, [])
      }
      packMap.get(packName)!.push(quest)
    }

    // Sort packs by minimum quest level
    const sortedPacks = Array.from(packMap.entries()).sort((a, b) => {
      const minA = Math.min(
        ...a[1].map((q) => (mode === 'heroic' ? q.heroicCR : q.epicCR) ?? 999)
      )
      const minB = Math.min(
        ...b[1].map((q) => (mode === 'heroic' ? q.heroicCR : q.epicCR) ?? 999)
      )
      return minA - minB
    })

    // First pass: collect all quests with XP to calculate median XP per level
    const xpByLevel = new Map<number, number[]>()
    for (const quest of selectedQuests) {
      const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
      if (questLevel === null) continue

      const tier = mode === 'heroic' ? 'heroic' : 'epic'
      const difficulty = bonuses.firstTimeCompletion === 'none' ? 'elite' : bonuses.firstTimeCompletion
      const baseXP = getBaseXP(quest.xp, tier, difficulty === 'reaper' ? 'elite' : difficulty)
      if (baseXP !== null) {
        if (!xpByLevel.has(questLevel)) {
          xpByLevel.set(questLevel, [])
        }
        const xpResult = calculateQuestXP(baseXP, bonuses, tier, quest.groupSize === 'Raid')
        xpByLevel.get(questLevel)!.push(xpResult.totalXP)
      }
    }

    // Calculate median XP per level
    const getMedianXP = (level: number): number => {
      const xps = xpByLevel.get(level)
      if (xps && xps.length > 0) {
        const sorted = [...xps].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : Math.floor((sorted[mid - 1] + sorted[mid]) / 2)
      }
      // Fallback: check nearby levels
      for (let offset = 1; offset <= 3; offset++) {
        const lower = xpByLevel.get(level - offset)
        const upper = xpByLevel.get(level + offset)
        if (lower && lower.length > 0) {
          const sorted = [...lower].sort((a, b) => a - b)
          return sorted[Math.floor(sorted.length / 2)]
        }
        if (upper && upper.length > 0) {
          const sorted = [...upper].sort((a, b) => a - b)
          return sorted[Math.floor(sorted.length / 2)]
        }
      }
      // Default estimate based on level (rough approximation)
      return mode === 'heroic' ? level * 3000 : level * 10000
    }

    // Process each pack
    for (const [packName, quests] of sortedPacks) {
      // Sort quests within pack by level
      const sortedQuests = [...quests].sort((a, b) => {
        const levelA = mode === 'heroic' ? a.heroicCR : a.epicCR
        const levelB = mode === 'heroic' ? b.heroicCR : b.epicCR
        return (levelA ?? 0) - (levelB ?? 0)
      })

      const packStartXP = cumulativeXP
      const packStartRank = xpToRank(cumulativeXP, mode, trTier)
      const packStartLevel = rankToLevel(packStartRank, mode)
      let packHasEstimated = false

      // Process each quest in the pack
      for (const quest of sortedQuests) {
        const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
        if (questLevel === null) continue

        const tier = mode === 'heroic' ? 'heroic' : 'epic'
        const difficulty =
          bonuses.firstTimeCompletion === 'none' ? 'elite' : bonuses.firstTimeCompletion
        const baseXP = getBaseXP(quest.xp, tier, difficulty === 'reaper' ? 'elite' : difficulty)

        // Calculate XP - use actual or estimate
        const isEstimated = baseXP === null
        let questXPBeforePenalty: number

        if (baseXP !== null) {
          const xpResult = calculateQuestXP(baseXP, bonuses, tier, quest.groupSize === 'Raid')
          questXPBeforePenalty = xpResult.totalXP
        } else {
          // Estimate XP based on median of same-level quests
          questXPBeforePenalty = getMedianXP(questLevel)
          packHasEstimated = true
        }

        const currentRank = xpToRank(cumulativeXP, mode, trTier)
        const currentLevel = rankToLevel(currentRank, mode)

        // Apply over-level penalty based on character's current level
        const questXP = applyOverLevelPenalty(questXPBeforePenalty, currentLevel, questLevel, tier)

        cumulativeXP += questXP

        const endRank = xpToRank(cumulativeXP, mode, trTier)
        const endLevel = rankToLevel(endRank, mode)

        rows.push({
          packName,
          questName: quest.name,
          questLevel,
          questXP,
          cumulativeXP,
          startLevel: currentLevel,
          startRank: currentRank,
          endLevel,
          endRank,
          levelsGained: endLevel - currentLevel + (endRank - currentRank) / 5,
          isPackSummary: false,
          isEstimated,
        })
      }

      // Add pack summary row
      const packEndRank = xpToRank(cumulativeXP, mode, trTier)
      const packEndLevel = rankToLevel(packEndRank, mode)
      const packXP = cumulativeXP - packStartXP

      if (sortedQuests.length > 1) {
        rows.push({
          packName,
          questName: null,
          questLevel: 0,
          questXP: packXP,
          cumulativeXP,
          startLevel: packStartLevel,
          startRank: packStartRank,
          endLevel: packEndLevel,
          endRank: packEndRank,
          levelsGained: packEndLevel - packStartLevel + (packEndRank - packStartRank) / 5,
          isPackSummary: true,
          isEstimated: packHasEstimated,
        })
      }
    }

    return rows
  }, [selectedQuests, mode, trTier, bonuses, startLevelDefault])

  const totalXP = progressionData.length > 0 ? progressionData[progressionData.length - 1]?.cumulativeXP ?? 0 : 0
  const targetXP = mode === 'heroic' ? getTotalHeroicXP(trTier) : getTotalEpicXP()
  const finalRank = xpToRank(totalXP, mode, trTier)
  const finalLevel = rankToLevel(finalRank, mode)

  // Get XP needed for next level
  const getXPForNextLevel = (currentRank: number): number => {
    const nextLevelRank = Math.ceil((currentRank + 1) / 5) * 5
    if (mode === 'heroic') {
      return getHeroicXPForRank(nextLevelRank, trTier)
    } else {
      return getEpicXPForRank(nextLevelRank)
    }
  }

  if (selectedQuests.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          XP Progression
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Select quests to see your leveling progression
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        XP Progression
      </Typography>

      {/* Summary stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Final Level
          </Typography>
          <Typography variant="h6">
            L{finalLevel}
            <Typography component="span" variant="body2" color="text.secondary">
              {' '}
              (Rank {finalRank})
            </Typography>
          </Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total XP
          </Typography>
          <Typography variant="h6">{formatXP(totalXP)}</Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            XP to Next Level
          </Typography>
          <Typography variant="h6">{formatXP(Math.max(0, getXPForNextLevel(finalRank) - totalXP))}</Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Coverage
          </Typography>
          <Typography variant="h6" color={totalXP >= targetXP ? 'success.main' : 'warning.main'}>
            {((totalXP / targetXP) * 100).toFixed(0)}%
          </Typography>
        </Box>
      </Box>

      {/* Progression table */}
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Pack / Quest</TableCell>
              <TableCell align="right">Level</TableCell>
              <TableCell align="right">XP</TableCell>
              <TableCell align="right">Total XP</TableCell>
              <TableCell align="center">Progress</TableCell>
              <TableCell align="right">Levels Gained</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {progressionData.map((row, index) => (
              <TableRow
                key={`${row.packName}-${row.questName ?? 'summary'}-${index}`}
                sx={{
                  bgcolor: row.isPackSummary
                    ? theme.palette.action.selected
                    : row.isEstimated
                      ? `${theme.palette.warning.main}15`
                      : 'transparent',
                  fontWeight: row.isPackSummary ? 'bold' : 'normal',
                  borderLeft: row.isEstimated && !row.isPackSummary ? `3px solid ${theme.palette.warning.main}` : 'none',
                }}
              >
                <TableCell>
                  {row.isPackSummary ? (
                    <Typography variant="body2" fontWeight="bold">
                      📦 {row.packName} (Total)
                      {row.isEstimated && (
                        <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                          *
                        </Typography>
                      )}
                    </Typography>
                  ) : (
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2">
                        {row.questName}
                        {row.isEstimated && (
                          <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                            (Est.)
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  {!row.isPackSummary && `L${row.questLevel}`}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={row.isPackSummary ? 'bold' : 'normal'}
                    color={row.isEstimated ? 'warning.main' : 'inherit'}
                    sx={{ fontStyle: row.isEstimated ? 'italic' : 'normal' }}
                  >
                    {row.isEstimated && '~'}{formatXP(row.questXP)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={row.isPackSummary ? 'bold' : 'normal'}
                  >
                    {formatXP(row.cumulativeXP)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    fontWeight={row.isPackSummary ? 'bold' : 'normal'}
                  >
                    L{row.startLevel}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}R{row.startRank}
                    </Typography>
                    {' → '}
                    L{row.endLevel}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}R{row.endRank}
                    </Typography>
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={row.isPackSummary ? 'bold' : 'normal'}
                    color={row.levelsGained >= 1 ? 'success.main' : 'text.secondary'}
                  >
                    +{row.levelsGained.toFixed(1)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
