import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { MouseEvent, useEffect, useMemo } from 'react'

import BonusConfigPanel from '@/components/trPlanner/BonusConfigPanel'
import LevelRuler from '@/components/trPlanner/LevelRuler'
import PlanManager from '@/components/trPlanner/PlanManager'
import QuestSelector from '@/components/trPlanner/QuestSelector'
import XPProgressionChart from '@/components/trPlanner/XPProgressionChart'
import { useTRPlanner } from '@/contexts/useTRPlanner'
import { PlanMode, TRTier } from '@/domains/trPlanner/levelRequirements'

export default function TRPlanner() {
  const {
    mode,
    trTier,
    bonuses,
    selectedQuestIds,
    selectedPackNames,
    savedPlans,
    currentPlanId,
    currentPlanName,
    quests,
    packs,
    loading,
    error,
    setMode,
    setTRTier,
    updateBonus,
    toggleQuest,
    togglePack,
    newPlan,
    savePlan,
    loadPlan,
    deletePlan,
    duplicatePlan,
    setPlanName,
    refreshQuests,
  } = useTRPlanner()

  // Load quest data on mount
  useEffect(() => {
    if (quests.length === 0 && !loading && !error) {
      void refreshQuests()
    }
  }, [quests.length, loading, error, refreshQuests])

  // Filter selected quests (only those valid for current mode)
  const selectedQuests = useMemo(() => {
    return quests.filter((q) => {
      if (!selectedQuestIds.has(q.id)) return false
      const level = mode === 'heroic' ? q.heroicCR : q.epicCR
      return level !== null
    })
  }, [quests, selectedQuestIds, mode])

  // Calculate bonus multiplier for display
  const bonusMultiplier = useMemo(() => {
    // Calculate the bonus multiplier from bonuses config
    // This is approximate since actual bonus depends on quest type
    let additive = 0
    let multiplicative = 1

    // First-time completion
    if (bonuses.firstTimeCompletion === 'elite' || bonuses.firstTimeCompletion === 'reaper') {
      additive += 0.45
    } else if (bonuses.firstTimeCompletion !== 'none') {
      additive += 0.20
    }

    // Delving
    if (bonuses.delvingBonus === 'full') additive += 1.50
    else if (bonuses.delvingBonus === 'half') additive += 0.75

    // Party bonuses
    if (bonuses.conquest) additive += 0.25
    if (bonuses.ingeniousDebilitation) additive += 0.30
    if (bonuses.ransackBonus) additive += 0.15
    if (bonuses.persistenceBonus) additive += 0.10
    if (bonuses.flawlessVictory) additive += 0.10

    // Daily bonus
    if (bonuses.dailyBonus) additive += mode === 'heroic' ? 0.25 : 0.40

    // Tome of Learning (first-time only, estimate at 50%)
    if (bonuses.tomeOfLearning === 'lesser') {
      additive += (mode === 'heroic' ? 0.25 : 0.15) * 0.5
    } else if (bonuses.tomeOfLearning === 'greater') {
      additive += (mode === 'heroic' ? 0.50 : 0.25) * 0.5
    }

    // Multiplicative bonuses
    if (bonuses.voiceOfTheMaster) multiplicative *= 1.05
    if (bonuses.shipBuff) multiplicative *= 1.05
    if (bonuses.vipBonus) multiplicative *= 1.10
    if (bonuses.xpElixir > 0) multiplicative *= (1 + bonuses.xpElixir / 100)
    if (bonuses.vipGroupBonus && bonuses.groupBonusPlayers > 0) {
      multiplicative *= (1 + Math.min(bonuses.groupBonusPlayers, 5) / 100)
    }

    return (1 + additive) * multiplicative
  }, [bonuses, mode])

  const handleModeChange = (_: MouseEvent<HTMLElement>, newMode: PlanMode | null) => {
    if (newMode) {
      setMode(newMode)
    }
  }

  const handleTRTierChange = (event: SelectChangeEvent) => {
    setTRTier(event.target.value as TRTier)
  }

  if (loading && quests.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header with Plan Manager */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">TR Planner</Typography>
          <PlanManager
            savedPlans={savedPlans}
            currentPlanId={currentPlanId}
            currentPlanName={currentPlanName}
            onNewPlan={newPlan}
            onSavePlan={savePlan}
            onLoadPlan={loadPlan}
            onDeletePlan={deletePlan}
            onDuplicatePlan={duplicatePlan}
            onSetPlanName={setPlanName}
            compact
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => refreshQuests()}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Mode and Settings Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="heroic">Heroic (1-20)</ToggleButton>
            <ToggleButton value="epic">Epic (20-30)</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>TR Count</InputLabel>
            <Select value={trTier} label="TR Count" onChange={handleTRTierChange}>
              <MenuItem value="1-3">Lives 1-3 (Base)</MenuItem>
              <MenuItem value="4-7">Lives 4-7 (+50%)</MenuItem>
              <MenuItem value="8+">Lives 8+ (+100%)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Typography variant="body2" color="text.secondary">
            {quests.length} quests loaded • {packs.length} adventure packs
          </Typography>
        </Box>
      </Paper>

      {/* XP Bonuses - Full width row above quest selection */}
      <Box sx={{ mb: 2 }}>
        <BonusConfigPanel
          bonuses={bonuses}
          mode={mode}
          onUpdateBonus={updateBonus}
          bonusPercentage={bonusMultiplier}
        />
      </Box>

      {/* Main Content - Two column layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '350px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {/* Quest Selector - Left side */}
        <Box sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: 400 }}>
          <QuestSelector
            packs={packs}
            selectedQuestIds={selectedQuestIds}
            selectedPackNames={selectedPackNames}
            mode={mode}
            onToggleQuest={toggleQuest}
            onTogglePack={togglePack}
          />
        </Box>

        {/* Main Content Area - Right side */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* XP Progression Chart */}
          <XPProgressionChart
            mode={mode}
            trTier={trTier}
            bonuses={bonuses}
            selectedQuests={selectedQuests}
          />

          {/* Level Coverage Chart */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Level Coverage
            </Typography>
            <LevelRuler
              mode={mode}
              trTier={trTier}
              bonuses={bonuses}
              selectedQuests={selectedQuests}
            />
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}
