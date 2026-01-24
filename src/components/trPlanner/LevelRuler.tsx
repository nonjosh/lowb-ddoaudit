import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material'
import { useMemo, useState } from 'react'

import { QuestWithXP } from '@/contexts/useTRPlanner'
import {
  getLevelMarkers,
  levelToStartRank,
  PlanMode,
  TRTier,
} from '@/domains/trPlanner/levelRequirements'
import {
  calculateQuestXP,
  getBaseXP,
  XPBonusConfig,
} from '@/domains/trPlanner/xpCalculator'

export interface CharacterMarker {
  id: string
  name: string
  level: number
  isOnline?: boolean
}

interface LevelRulerProps {
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuests: QuestWithXP[]
  completedQuestIds: Set<string>
  characterMarkers?: CharacterMarker[]
}

// Color palette for different packs
const PACK_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#009688', // Teal
  '#795548', // Brown
  '#607D8B', // Blue Grey
]

function getPackColor(packName: string): string {
  // Use a hash of the pack name for consistent coloring regardless of order
  let hash = 0
  for (let i = 0; i < packName.length; i++) {
    const char = packName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return PACK_COLORS[Math.abs(hash) % PACK_COLORS.length]
}

interface PackCoverage {
  packName: string
  color: string
  quests: {
    quest: QuestWithXP
    startLevel: number
    endLevel: number
    xp: number
    baseXP: number
    isEstimated: boolean // true if XP is estimated (no data from API)
  }[]
  minLevel: number
  maxLevel: number
  totalXP: number
}

export default function LevelRuler({ mode, bonuses, selectedQuests, completedQuestIds, characterMarkers = [] }: LevelRulerProps) {
  const theme = useTheme()
  const levelMarkers = useMemo(() => getLevelMarkers(mode), [mode])

  // Group quests by pack and calculate coverage
  const packCoverages = useMemo(() => {
    const packMap = new Map<string, PackCoverage>()

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

    // Group by pack and sort quests within each pack
    for (const quest of selectedQuests) {
      const packName = quest.pack ?? 'Free to Play'
      if (!packMap.has(packName)) {
        packMap.set(packName, {
          packName,
          color: getPackColor(packName),
          quests: [],
          minLevel: Infinity,
          maxLevel: -Infinity,
          totalXP: 0,
        })
      }

      const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
      if (questLevel === null) continue

      const tier = mode === 'heroic' ? 'heroic' : 'epic'
      const difficulty = bonuses.firstTimeCompletion === 'none' ? 'elite' : bonuses.firstTimeCompletion
      const baseXP = getBaseXP(quest.xp, tier, difficulty === 'reaper' ? 'elite' : difficulty)

      // Use actual XP if available, otherwise estimate
      const isEstimated = baseXP === null
      let xp: number
      let actualBaseXP: number

      if (baseXP !== null) {
        const xpResult = calculateQuestXP(baseXP, bonuses, tier, quest.groupSize === 'Raid')
        xp = xpResult.totalXP
        actualBaseXP = baseXP
      } else {
        // Estimate XP based on median of same-level quests
        xp = getMedianXP(questLevel)
        actualBaseXP = 0
      }

      const startLevel = questLevel
      const endLevel = Math.min(
        mode === 'heroic' ? 20 : 30,
        questLevel + (mode === 'heroic' ? 2 : 4)
      )

      const pack = packMap.get(packName)!
      pack.quests.push({
        quest,
        startLevel,
        endLevel,
        xp,
        baseXP: actualBaseXP,
        isEstimated,
      })
      pack.minLevel = Math.min(pack.minLevel, startLevel)
      pack.maxLevel = Math.max(pack.maxLevel, endLevel)
      pack.totalXP += xp
    }

    // Sort quests within each pack by level
    for (const pack of packMap.values()) {
      pack.quests.sort((a, b) => a.startLevel - b.startLevel)
    }

    // Sort packs by minimum level
    return Array.from(packMap.values()).sort((a, b) => a.minLevel - b.minLevel)
  }, [selectedQuests, mode, bonuses])

  // State for manually collapsed packs
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set())
  // State for packs manually expanded (overrides auto-collapse)
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set())

  // Auto-collapse packs when all quests are completed
  const autoCollapsedPacks = useMemo(() => {
    const fullyCompletedPacks = new Set<string>()
    for (const pack of packCoverages) {
      const allCompleted = pack.quests.every((q) => completedQuestIds.has(q.quest.id))
      if (allCompleted && pack.quests.length > 0) {
        fullyCompletedPacks.add(pack.packName)
      }
    }
    return fullyCompletedPacks
  }, [packCoverages, completedQuestIds])

  // Determine if a pack should be collapsed
  const isPackCollapsed = (packName: string): boolean => {
    // Manual expansion overrides auto-collapse
    if (manuallyExpanded.has(packName)) return false
    // Manual collapse takes precedence
    if (manuallyCollapsed.has(packName)) return true
    // Otherwise, auto-collapse if all quests completed
    return autoCollapsedPacks.has(packName)
  }

  const togglePackCollapse = (packName: string) => {
    const currentlyCollapsed = isPackCollapsed(packName)
    if (currentlyCollapsed) {
      // Expand: add to manually expanded, remove from manually collapsed
      setManuallyExpanded((prev) => new Set([...prev, packName]))
      setManuallyCollapsed((prev) => {
        const newSet = new Set(prev)
        newSet.delete(packName)
        return newSet
      })
    } else {
      // Collapse: add to manually collapsed, remove from manually expanded
      setManuallyCollapsed((prev) => new Set([...prev, packName]))
      setManuallyExpanded((prev) => {
        const newSet = new Set(prev)
        newSet.delete(packName)
        return newSet
      })
    }
  }

  const totalRanks = mode === 'heroic' ? 96 : 51

  // Calculate ruler width based on level
  const levelToPercent = (level: number): number => {
    const rank = levelToStartRank(level, mode)
    return (rank / totalRanks) * 100
  }

  // Calculate row height for packed display
  const ROW_HEIGHT = 28
  const PACK_HEADER_HEIGHT = 24

  // Calculate total height needed and pre-compute Y positions
  const { totalHeight, packPositions } = useMemo(() => {
    let currentY = 0
    const positions: Array<{
      pack: PackCoverage
      packStartY: number
      isCollapsed: boolean
      questPositions: Array<{
        quest: PackCoverage['quests'][0]
        questIndex: number
        rowY: number
      }>
    }> = []

    for (const pack of packCoverages) {
      const packStartY = currentY
      const isCollapsed = isPackCollapsed(pack.packName)
      currentY += PACK_HEADER_HEIGHT

      const questPositions = pack.quests.map((quest, questIndex) => {
        const rowY = isCollapsed ? packStartY + PACK_HEADER_HEIGHT : currentY
        if (!isCollapsed) {
          currentY += ROW_HEIGHT
        }
        return { quest, questIndex, rowY }
      })

      positions.push({ pack, packStartY, isCollapsed, questPositions })
    }

    return {
      totalHeight: Math.max(200, currentY + 20),
      packPositions: positions,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packCoverages, manuallyCollapsed, manuallyExpanded, autoCollapsedPacks])

  return (
    <Box sx={{ width: '100%' }}>
      {/* Level ruler header */}
      <Box
        sx={{
          position: 'relative',
          height: 30,
          borderBottom: `1px solid ${theme.palette.divider}`,
          mb: 1,
        }}
      >
        {levelMarkers.map((marker) => (
          <Box
            key={marker.level}
            sx={{
              position: 'absolute',
              left: `${levelToPercent(marker.level)}%`,
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {marker.label}
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: -8,
                width: 1,
                height: 8,
                bgcolor: 'divider',
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Quest coverage bars - grouped by pack */}
      <Box
        sx={{
          position: 'relative',
          height: totalHeight,
          overflow: 'hidden',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* Background grid lines */}
        {levelMarkers.map((marker) => (
          <Box
            key={marker.level}
            sx={{
              position: 'absolute',
              left: `${levelToPercent(marker.level)}%`,
              top: 0,
              bottom: 0,
              width: 1,
              bgcolor: marker.level % 5 === 0 ? 'divider' : 'action.hover',
              zIndex: 0,
            }}
          />
        ))}

        {/* Character markers - grouped by level */}
        {(() => {
          // Group characters by level
          const charsByLevel = new Map<number, typeof characterMarkers>()
          for (const char of characterMarkers) {
            if (!charsByLevel.has(char.level)) {
              charsByLevel.set(char.level, [])
            }
            charsByLevel.get(char.level)!.push(char)
          }

          return Array.from(charsByLevel.entries()).map(([level, chars]) => {
            const charPercent = levelToPercent(level)
            const hasOnline = chars.some((c) => c.isOnline)
            const markerColor = hasOnline ? 'success.main' : 'warning.main'
            const markerHoverColor = hasOnline ? 'success.light' : 'warning.light'
            // Width based on number of characters (min 3px, max 10px)
            const markerWidth = Math.min(10, Math.max(3, chars.length * 3))

            return (
              <Tooltip
                key={`level-${level}`}
                title={
                  <Box>
                    {chars.map((char) => (
                      <Box key={char.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {char.isOnline && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                            }}
                          />
                        )}
                        {char.name} - lv{char.level}
                        {char.isOnline && ' (online)'}
                      </Box>
                    ))}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${charPercent}%`,
                    transform: 'translateX(-50%)',
                    top: 0,
                    bottom: 0,
                    width: markerWidth,
                    bgcolor: markerColor,
                    zIndex: 5,
                    cursor: 'pointer',
                    '&:hover': {
                      width: markerWidth + 2,
                      bgcolor: markerHoverColor,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: chars.length > 1 ? 12 : 8,
                      height: chars.length > 1 ? 12 : 8,
                      bgcolor: markerColor,
                      borderRadius: '50%',
                      border: `2px solid ${theme.palette.background.paper}`,
                    },
                    '&::after': chars.length > 1 ? {
                      content: `"${chars.length}"`,
                      position: 'absolute',
                      top: -18,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: markerColor,
                      bgcolor: theme.palette.background.paper,
                      padding: '0 2px',
                      borderRadius: '2px',
                      zIndex: 10,
                    } : undefined,
                  }}
                />
              </Tooltip>
            )
          })
        })()}

        {/* Pack groups */}
        {packPositions.map(({ pack, packStartY, isCollapsed, questPositions }) => {
          const questRows = isCollapsed ? null : questPositions.map(({ quest: item, questIndex, rowY }) => {
            const leftPercent = levelToPercent(item.startLevel)
            const rightPercent = levelToPercent(item.endLevel + 1)
            const widthPercent = Math.max(2, rightPercent - leftPercent)

            return (
              <Tooltip
                key={`${item.quest.id}-${questIndex}`}
                title={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.quest.name}
                      {item.isEstimated && (
                        <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                          (Est.)
                        </Typography>
                      )}
                    </Typography>
                    {item.quest.patron && (
                      <Typography variant="caption" display="block" color="info.main">
                        Patron: {item.quest.patron}
                      </Typography>
                    )}
                    <Typography variant="caption" display="block">
                      {pack.packName}
                    </Typography>
                    <Typography variant="caption" display="block" color={item.isEstimated ? 'warning.main' : 'inherit'}>
                      lv{item.startLevel} | XP: {item.isEstimated ? '~' : ''}{item.xp.toLocaleString()}
                      {item.isEstimated && ' (estimated)'}
                    </Typography>
                    {!item.isEstimated && (
                      <Typography variant="caption" display="block">
                        Base XP: {item.baseXP.toLocaleString()} | Size: {item.quest.groupSize}
                      </Typography>
                    )}
                    {item.isEstimated && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Size: {item.quest.groupSize} | No XP data available
                      </Typography>
                    )}
                  </Box>
                }
                arrow
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: rowY + 2,
                    height: ROW_HEIGHT - 4,
                    bgcolor: pack.color,
                    borderRadius: 1,
                    opacity: item.isEstimated ? 0.6 : 0.85,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    border: item.isEstimated ? `2px dashed ${theme.palette.background.paper}` : 'none',
                    px: 0.5,
                    overflow: 'hidden',
                    zIndex: 1,
                    '&:hover': {
                      opacity: 1,
                      zIndex: 10,
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.65rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textShadow: '0 0 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {item.quest.name}
                  </Typography>
                </Box>
              </Tooltip>
            )
          })

          return (
            <Box key={pack.packName}>
              {/* Pack header */}
              <Box
                onClick={() => togglePackCollapse(pack.packName)}
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: packStartY,
                  height: PACK_HEADER_HEIGHT,
                  bgcolor: 'action.hover',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  zIndex: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
                  {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                </IconButton>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 0.5,
                    bgcolor: pack.color,
                    mr: 1,
                  }}
                />
                <Typography variant="caption" fontWeight="bold" sx={{ flex: 1 }}>
                  {pack.packName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {pack.quests.length} quests • {pack.totalXP.toLocaleString()} XP
                </Typography>
              </Box>
              {questRows}
            </Box>
          )
        })}

        {/* Empty state */}
        {packCoverages.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Select quests to see level coverage
            </Typography>
          </Box>
        )}
      </Box>

    </Box>
  )
}
