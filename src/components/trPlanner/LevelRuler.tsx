import { Box, Tooltip, Typography, useTheme } from '@mui/material'
import { useMemo } from 'react'

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

interface LevelRulerProps {
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuests: QuestWithXP[]
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

function getPackColor(_packName: string, packIndex: number): string {
  return PACK_COLORS[packIndex % PACK_COLORS.length]
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
  }[]
  minLevel: number
  maxLevel: number
  totalXP: number
}

export default function LevelRuler({ mode, bonuses, selectedQuests }: LevelRulerProps) {
  const theme = useTheme()
  const levelMarkers = useMemo(() => getLevelMarkers(mode), [mode])

  // Group quests by pack and calculate coverage
  const packCoverages = useMemo(() => {
    const packMap = new Map<string, PackCoverage>()
    let packIndex = 0

    // Group by pack and sort quests within each pack
    for (const quest of selectedQuests) {
      const packName = quest.pack ?? 'Free to Play'
      if (!packMap.has(packName)) {
        packMap.set(packName, {
          packName,
          color: getPackColor(packName, packIndex++),
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
      if (baseXP === null) continue

      const xpResult = calculateQuestXP(baseXP, bonuses, tier, quest.groupSize === 'Raid')

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
        xp: xpResult.totalXP,
        baseXP,
      })
      pack.minLevel = Math.min(pack.minLevel, startLevel)
      pack.maxLevel = Math.max(pack.maxLevel, endLevel)
      pack.totalXP += xpResult.totalXP
    }

    // Sort quests within each pack by level
    for (const pack of packMap.values()) {
      pack.quests.sort((a, b) => a.startLevel - b.startLevel)
    }

    // Sort packs by minimum level
    return Array.from(packMap.values()).sort((a, b) => a.minLevel - b.minLevel)
  }, [selectedQuests, mode, bonuses])

  const totalRanks = mode === 'heroic' ? 96 : 51

  // Calculate ruler width based on level
  const levelToPercent = (level: number): number => {
    const rank = levelToStartRank(level, mode)
    return (rank / totalRanks) * 100
  }

  // Calculate row height for packed display
  const ROW_HEIGHT = 28
  const PACK_HEADER_HEIGHT = 24

  // Calculate total height needed
  const totalHeight = useMemo(() => {
    let height = 0
    for (const pack of packCoverages) {
      height += PACK_HEADER_HEIGHT + pack.quests.length * ROW_HEIGHT
    }
    return Math.max(200, height + 20)
  }, [packCoverages])

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

        {/* Pack groups */}
        {(() => {
          let currentY = 0
          return packCoverages.map((pack) => {
            const packStartY = currentY
            currentY += PACK_HEADER_HEIGHT

            const questRows = pack.quests.map((item, questIndex) => {
              const leftPercent = levelToPercent(item.startLevel)
              const rightPercent = levelToPercent(item.endLevel + 1)
              const widthPercent = Math.max(2, rightPercent - leftPercent)
              const rowY = currentY
              currentY += ROW_HEIGHT

              return (
                <Tooltip
                  key={`${item.quest.id}-${questIndex}`}
                  title={
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {item.quest.name}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {pack.packName}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Level: {item.startLevel} | XP: {item.xp.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Base XP: {item.baseXP.toLocaleString()} | Size: {item.quest.groupSize}
                      </Typography>
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
                      opacity: 0.85,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
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
                  }}
                >
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
          })
        })()}

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

      {/* Legend */}
      {packCoverages.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {packCoverages.map((pack) => (
            <Box key={pack.packName} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: pack.color,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {pack.packName}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
