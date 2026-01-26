import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchCharactersByIds } from '@/api/ddoAudit'
import BonusConfigPanel from '@/components/trPlanner/BonusConfigPanel'
import LevelRuler from '@/components/trPlanner/LevelRuler'
import PlanManager from '@/components/trPlanner/PlanManager'
import QuestSelector from '@/components/trPlanner/QuestSelector'
import SagaSummary from '@/components/trPlanner/SagaSummary'
import XPProgressionChart from '@/components/trPlanner/XPProgressionChart'
import { CHARACTERS } from '@/config/characters'
import { useTRPlanner } from '@/contexts/useTRPlanner'
import { PlanMode, TRTier } from '@/domains/trPlanner/levelRequirements'

export default function TRPlanner() {
  const {
    mode,
    trTier,
    bonuses,
    selectedQuestIds: heroicEpicSelectedQuestIds,
    selectedPackNames: heroicEpicSelectedPackNames,
    etrSelectedQuestIds,
    etrSelectedPackNames,
    completedQuestIds,
    sagaFilter,
    startLevel,
    selectedCharacterIds,
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
    setStartLevel,
    toggleQuest,
    togglePack,
    toggleCharacter,
    toggleQuestCompletion,
    markQuestsCompleted,
    markQuestsIncomplete,
    setSagaFilter,
    toggleSagaFilter,
    newPlan,
    savePlan,
    loadPlan,
    deletePlan,
    duplicatePlan,
    setPlanName,
    refreshQuests,
  } = useTRPlanner()

  // Character data state - fetched directly from API
  const [charactersById, setCharactersById] = useState<Record<string, { name: string; total_level: number; is_online?: boolean; location_id?: string }>>({})
  const [characterLoading, setCharacterLoading] = useState(false)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track previous location IDs to detect quest enter/leave
  const prevLocationIds = useRef<Record<string, string | undefined>>({})

  // Compute effective selected quest IDs based on mode
  // In ETR mode, use etrSelectedQuestIds; otherwise use heroicEpicSelectedQuestIds
  const selectedQuestIds = useMemo(() => {
    return mode === 'etr' ? etrSelectedQuestIds : heroicEpicSelectedQuestIds
  }, [mode, etrSelectedQuestIds, heroicEpicSelectedQuestIds])

  const selectedPackNames = useMemo(() => {
    return mode === 'etr' ? etrSelectedPackNames : heroicEpicSelectedPackNames
  }, [mode, etrSelectedPackNames, heroicEpicSelectedPackNames])

  // Compute quest IDs selected in the other epic/etr mode (for mutual exclusion)
  const otherModeSelectedQuestIds = useMemo(() => {
    if (mode === 'epic') return etrSelectedQuestIds
    if (mode === 'etr') return heroicEpicSelectedQuestIds
    return new Set<string>() // heroic mode has no mutual exclusion
  }, [mode, etrSelectedQuestIds, heroicEpicSelectedQuestIds])
  // Build areaId to questId map for auto-select
  const areaToQuestMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const quest of quests) {
      if (quest.areaId) {
        map.set(quest.areaId, quest.id)
      }
    }
    return map
  }, [quests])

  // Fetch character data from API
  const fetchCharacters = useCallback(async () => {
    const characterIds = Object.keys(CHARACTERS)
    if (characterIds.length === 0) return

    setCharacterLoading(true)
    try {
      const data = await fetchCharactersByIds(characterIds)
      setCharactersById(data as Record<string, { name: string; total_level: number; is_online?: boolean }>)
    } catch (err) {
      console.error('Failed to fetch character data:', err)
    } finally {
      setCharacterLoading(false)
    }
  }, [])

  // Fetch characters on mount and every 60 seconds
  useEffect(() => {
    void fetchCharacters()

    const scheduleNextFetch = () => {
      fetchTimeoutRef.current = setTimeout(() => {
        void fetchCharacters()
        scheduleNextFetch()
      }, 60000) // 60 seconds
    }

    scheduleNextFetch()

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [fetchCharacters])

  // Load quest data on mount
  useEffect(() => {
    if (quests.length === 0 && !loading && !error) {
      void refreshQuests()
    }
  }, [quests.length, loading, error, refreshQuests])

  // Auto-select quests when selected characters enter, mark completed when they leave
  useEffect(() => {
    if (areaToQuestMap.size === 0) return

    for (const charId of selectedCharacterIds) {
      const char = charactersById[charId]
      if (!char?.is_online) continue

      const currentLocation = char.location_id
      const previousLocation = prevLocationIds.current[charId]

      // Character entered a new quest area
      if (currentLocation && currentLocation !== previousLocation) {
        const questId = areaToQuestMap.get(currentLocation)
        if (questId && !selectedQuestIds.has(questId)) {
          // Auto-select the quest
          toggleQuest(questId)
        }
      }

      // Character left a quest area (was in a quest, now somewhere else or offline)
      if (previousLocation && previousLocation !== currentLocation) {
        const questId = areaToQuestMap.get(previousLocation)
        if (questId && selectedQuestIds.has(questId) && !completedQuestIds.has(questId)) {
          // Mark the quest as completed
          toggleQuestCompletion(questId)
        }
      }

      // Update previous location
      prevLocationIds.current[charId] = currentLocation
    }
  }, [charactersById, selectedCharacterIds, areaToQuestMap, selectedQuestIds, completedQuestIds, toggleQuest, toggleQuestCompletion])

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
      // Update start level to appropriate default when mode changes
      if (newMode === 'heroic') {
        setStartLevel(1)
      } else {
        // Both epic and etr start at level 20
        setStartLevel(20)
      }
    }
  }

  const handleTRTierChange = (event: SelectChangeEvent) => {
    setTRTier(event.target.value as TRTier)
  }

  const handleStartLevelChange = (event: SelectChangeEvent<number>) => {
    setStartLevel(event.target.value as number)
  }

  // Filter characters within level range for the current mode
  const availableCharacters = useMemo(() => {
    const minLevel = mode === 'heroic' ? 1 : 20
    const maxLevel = mode === 'heroic' ? 20 : 30

    return Object.entries(charactersById)
      .filter(([, char]) => {
        const level = char?.total_level
        return level !== undefined && level >= minLevel && level <= maxLevel
      })
      .map(([id, char]) => ({
        id,
        name: char.name,
        level: char.total_level,
        isOnline: char.is_online ?? false,
      }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
  }, [charactersById, mode])

  // Get selected characters with their info
  const selectedCharacters = useMemo(() => {
    return availableCharacters.filter((c) => selectedCharacterIds.has(c.id))
  }, [availableCharacters, selectedCharacterIds])

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
            <ToggleButton value="etr">ETR (20-30)</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>TR Count</InputLabel>
            <Select value={trTier} label="TR Count" onChange={handleTRTierChange}>
              <MenuItem value="1-3">Lives 1-3 (Base)</MenuItem>
              <MenuItem value="4-7">Lives 4-7 (+50%)</MenuItem>
              <MenuItem value="8+">Lives 8+ (+100%)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Start Level</InputLabel>
            <Select
              value={startLevel}
              label="Start Level"
              onChange={handleStartLevelChange}
            >
              {(mode === 'heroic'
                ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
                : [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
              ).map((level) => (
                <MenuItem key={level} value={level}>
                  lv{level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {availableCharacters.length > 0 ? (
            <Autocomplete
              multiple
              size="small"
              options={availableCharacters}
              getOptionLabel={(option) => `${option.name} (lv${option.level})`}
              value={selectedCharacters}
              onChange={(_, newValue) => {
                // Clear current selection and add new ones
                for (const char of selectedCharacters) {
                  if (!newValue.find((v) => v.id === char.id)) {
                    toggleCharacter(char.id)
                  }
                }
                for (const char of newValue) {
                  if (!selectedCharacterIds.has(char.id)) {
                    toggleCharacter(char.id)
                  }
                }
              }}
              renderOption={(props, option, { selected }) => {
                const { key, ...rest } = props
                return (
                  <li key={key} {...rest}>
                    <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                    {option.isOnline && (
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          display: 'inline-block',
                          mr: 0.5,
                        }}
                      />
                    )}
                    {option.name} (lv{option.level})
                  </li>
                )
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Character Markers"
                  placeholder="Select..."
                />
              )}
              sx={{ minWidth: 200 }}
              loading={characterLoading}
              disableCloseOnSelect
            />
          ) : characterLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="caption" color="text.secondary">
                Loading characters...
              </Typography>
            </Box>
          ) : null}

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

      {/* Main Content - Two column layout (responsive for vertical monitors) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr', lg: '350px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {/* Quest Selector - Left side */}
        <Box sx={{ maxHeight: { xs: 'none', md: 'calc(100vh - 350px)' }, minHeight: 400 }}>
          <QuestSelector
            packs={packs}
            selectedQuestIds={selectedQuestIds}
            selectedPackNames={selectedPackNames}
            completedQuestIds={completedQuestIds}
            otherModeSelectedQuestIds={otherModeSelectedQuestIds}
            sagaFilter={sagaFilter}
            mode={mode}
            onToggleQuest={toggleQuest}
            onTogglePack={togglePack}
            onToggleQuestCompletion={toggleQuestCompletion}
            onSetSagaFilter={setSagaFilter}
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
            completedQuestIds={completedQuestIds}
            onToggleQuestCompletion={toggleQuestCompletion}
            onMarkQuestsCompleted={markQuestsCompleted}
            onMarkQuestsIncomplete={markQuestsIncomplete}
            startLevel={startLevel}
          />

          {/* Saga Progress Summary */}
          <SagaSummary
            mode={mode}
            selectedQuests={selectedQuests}
            completedQuestIds={completedQuestIds}
            sagaFilter={sagaFilter}
            onToggleSagaFilter={toggleSagaFilter}
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
              completedQuestIds={completedQuestIds}
              characterMarkers={selectedCharacters}
            />
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}
