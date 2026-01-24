import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo, useState } from 'react'
import React from 'react'

import ItemLootButton from '@/components/items/ItemLootButton'
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

  // Group rows by pack for collapsible display
  const packGroups = useMemo(() => {
    const groups: Array<{
      packName: string
      summaryRow: ProgressionRow | null
      questRows: ProgressionRow[]
    }> = []

    let currentPack: string | null = null
    let currentQuests: ProgressionRow[] = []

    for (const row of progressionData) {
      if (row.isPackSummary) {
        groups.push({
          packName: row.packName,
          summaryRow: row,
          questRows: currentQuests,
        })
        currentPack = null
        currentQuests = []
      } else {
        if (currentPack !== row.packName) {
          if (currentPack !== null && currentQuests.length > 0) {
            // Pack with only one quest (no summary row)
            groups.push({
              packName: currentPack,
              summaryRow: null,
              questRows: currentQuests,
            })
          }
          currentPack = row.packName
          currentQuests = []
        }
        currentQuests.push(row)
      }
    }

    // Handle last pack if no summary
    if (currentPack !== null && currentQuests.length > 0) {
      groups.push({
        packName: currentPack,
        summaryRow: null,
        questRows: currentQuests,
      })
    }

    return groups
  }, [progressionData])

  // State for collapsed packs
  const [collapsedPacks, setCollapsedPacks] = useState<Set<string>>(new Set())

  const togglePackCollapse = (packName: string) => {
    setCollapsedPacks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(packName)) {
        newSet.delete(packName)
      } else {
        newSet.add(packName)
      }
      return newSet
    })
  }

  const collapseAll = () => {
    const collapsiblePacks = packGroups
      .filter((g) => g.questRows.length > 1 || g.summaryRow !== null)
      .map((g) => g.packName)
    setCollapsedPacks(new Set(collapsiblePacks))
  }

  const expandAll = () => {
    setCollapsedPacks(new Set())
  }

  const allCollapsed = packGroups
    .filter((g) => g.questRows.length > 1 || g.summaryRow !== null)
    .every((g) => collapsedPacks.has(g.packName))

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          XP Progression
        </Typography>
        <Tooltip title={allCollapsed ? 'Expand all packs' : 'Collapse all packs'}>
          <IconButton size="small" onClick={allCollapsed ? expandAll : collapseAll}>
            {allCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Final Level
          </Typography>
          <Typography variant="h6">
            lv{finalLevel}
            <Typography component="span" variant="body2" color="text.secondary">
              {' '}
              (rank {finalRank})
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
              <TableCell align="right">XP / Total</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Progress</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packGroups.map((group) => {
              const isCollapsed = collapsedPacks.has(group.packName)
              const displayRow = group.summaryRow ?? group.questRows[group.questRows.length - 1]
              const hasMultipleQuests = group.questRows.length > 1 || group.summaryRow !== null

              return (
                <React.Fragment key={group.packName}>
                  {/* Pack header row */}
                  <TableRow
                    sx={{
                      bgcolor: theme.palette.action.selected,
                      cursor: hasMultipleQuests ? 'pointer' : 'default',
                      '&:hover': hasMultipleQuests ? { bgcolor: theme.palette.action.hover } : {},
                    }}
                    onClick={() => hasMultipleQuests && togglePackCollapse(group.packName)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {hasMultipleQuests && (
                          <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
                            {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                          </IconButton>
                        )}
                        <Typography variant="body2" fontWeight="bold">
                          📦 {group.packName}
                          {group.summaryRow ? ` (${group.questRows.length})` : ''}
                          {displayRow?.isEstimated && (
                            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                              *
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" />
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {displayRow && formatXP(group.summaryRow?.questXP ?? group.questRows.reduce((sum, r) => sum + r.questXP, 0))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {displayRow && `/ ${formatXP(displayRow.cumulativeXP)}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {displayRow && (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {(group.questRows[0]?.startLevel ?? displayRow.startLevel) === displayRow.endLevel ? (
                              <>
                                lv{displayRow.endLevel}{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{group.questRows[0]?.startRank ?? displayRow.startRank}
                                </Typography>
                                {' → '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{displayRow.endRank}
                                </Typography>
                              </>
                            ) : (
                              <>
                                lv{group.questRows[0]?.startLevel ?? displayRow.startLevel}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{group.questRows[0]?.startRank ?? displayRow.startRank}
                                </Typography>
                                {' → '}
                                lv{displayRow.endLevel}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{displayRow.endRank}
                                </Typography>
                              </>
                            )}
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            color={(group.summaryRow?.levelsGained ?? displayRow.levelsGained) >= 1 ? 'success.main' : 'text.secondary'}
                          >
                            +lv{(group.summaryRow?.levelsGained ?? group.questRows.reduce((sum, r) => sum + r.levelsGained, 0)).toFixed(1)}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Quest rows (collapsible) */}
                  {group.questRows.map((row, index) => (
                    <TableRow
                      key={`${row.packName}-${row.questName}-${index}`}
                      sx={{
                        display: isCollapsed ? 'none' : 'table-row',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ pl: 3, display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {row.questName}
                            {row.isEstimated && (
                              <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                                (Est.)
                              </Typography>
                            )}
                          </Typography>
                          {row.questName && <ItemLootButton questName={row.questName} />}
                        </Box>
                      </TableCell>
                      <TableCell align="right">lv{row.questLevel}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={row.isEstimated ? 'warning.main' : 'inherit'}
                          sx={{ fontStyle: row.isEstimated ? 'italic' : 'normal' }}
                        >
                          {row.isEstimated && '~'}{formatXP(row.questXP)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          / {formatXP(row.cumulativeXP)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {row.startLevel === row.endLevel ? (
                              <>
                                lv{row.endLevel}{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{row.startRank}
                                </Typography>
                                {' → '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{row.endRank}
                                </Typography>
                              </>
                            ) : (
                              <>
                                lv{row.startLevel}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{row.startRank}
                                </Typography>
                                {' → '}
                                lv{row.endLevel}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  rank{row.endRank}
                                </Typography>
                              </>
                            )}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={row.levelsGained >= 1 ? 'success.main' : 'text.secondary'}
                          >
                            +lv{row.levelsGained.toFixed(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
