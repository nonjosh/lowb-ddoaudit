import { Box, Paper, Typography } from '@mui/material'
import { useMemo } from 'react'

import { QuestWithXP } from '@/contexts/useTRPlanner'
import {
  getTotalEpicXP,
  getTotalHeroicXP,
  PlanMode,
  TRTier,
} from '@/domains/trPlanner/levelRequirements'
import {
  calculateQuestXP,
  formatXP,
  getBaseXP,
  XPBonusConfig,
} from '@/domains/trPlanner/xpCalculator'

interface XPSummaryProps {
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuests: QuestWithXP[]
  onBonusMultiplierChange?: (multiplier: number) => void
}

export default function XPSummary({ mode, trTier, bonuses, selectedQuests, onBonusMultiplierChange }: XPSummaryProps) {
  const summary = useMemo(() => {
    let totalXP = 0
    let totalBaseXP = 0
    let questCount = 0
    let raidCount = 0

    for (const quest of selectedQuests) {
      const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
      if (questLevel === null) continue

      const tier = mode === 'heroic' ? 'heroic' : 'epic'
      const difficulty = bonuses.firstTimeCompletion === 'none' ? 'elite' : bonuses.firstTimeCompletion
      const baseXP = getBaseXP(quest.xp, tier, difficulty === 'reaper' ? 'elite' : difficulty)
      if (baseXP === null) continue

      const xpResult = calculateQuestXP(baseXP, bonuses, tier, quest.groupSize === 'Raid')

      totalXP += xpResult.totalXP
      totalBaseXP += baseXP
      questCount++
      if (quest.groupSize === 'Raid') raidCount++
    }

    const requiredXP = mode === 'heroic' ? getTotalHeroicXP(trTier) : getTotalEpicXP()
    const coveragePercent = requiredXP > 0 ? (totalXP / requiredXP) * 100 : 0
    const bonusMultiplier = totalBaseXP > 0 ? totalXP / totalBaseXP : 0

    // Notify parent of bonus multiplier change
    if (onBonusMultiplierChange) {
      onBonusMultiplierChange(bonusMultiplier)
    }

    return {
      totalXP,
      totalBaseXP,
      requiredXP,
      coveragePercent,
      bonusMultiplier,
      questCount,
      raidCount,
    }
  }, [mode, trTier, bonuses, selectedQuests, onBonusMultiplierChange])

  const isOverTarget = summary.coveragePercent >= 100

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        XP Summary
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Estimated XP
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            {formatXP(summary.totalXP)}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Required XP ({mode === 'heroic' ? `lv1→20, TR ${trTier}` : 'lv20→30'})
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {formatXP(summary.requiredXP)}
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Coverage
          </Typography>
          <Typography
            variant="caption"
            color={isOverTarget ? 'success.main' : 'warning.main'}
            fontWeight="bold"
          >
            {summary.coveragePercent.toFixed(0)}%
          </Typography>
        </Box>
        <Box
          sx={{
            height: 8,
            bgcolor: 'action.hover',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.min(100, summary.coveragePercent)}%`,
              bgcolor: isOverTarget ? 'success.main' : 'warning.main',
              borderRadius: 1,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
        {isOverTarget && (
          <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
            ✓ Sufficient XP to reach target level
          </Typography>
        )}
        {!isOverTarget && summary.questCount > 0 && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
            Need {formatXP(summary.requiredXP - summary.totalXP)} more XP
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="h6">{summary.questCount}</Typography>
          <Typography variant="caption" color="text.secondary">
            Quests
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="h6">{summary.raidCount}</Typography>
          <Typography variant="caption" color="text.secondary">
            Raids
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}
