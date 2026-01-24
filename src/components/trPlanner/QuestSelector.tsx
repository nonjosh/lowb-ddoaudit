import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material'
import { SyntheticEvent, useMemo, useState } from 'react'

import sagasData from '@/data/sagas.json'
import { AdventurePack, QuestWithXP } from '@/contexts/useTRPlanner'
import { PlanMode } from '@/domains/trPlanner/levelRequirements'

interface QuestSelectorProps {
  packs: AdventurePack[]
  selectedQuestIds: Set<string>
  selectedPackNames: Set<string>
  mode: PlanMode
  onToggleQuest: (questId: string) => void
  onTogglePack: (packName: string) => void
}

// Level filter options for heroic mode
const HEROIC_LEVEL_FILTERS = [
  { value: 'all', label: 'All' },
  { value: '1-5', label: 'lv1-5', min: 1, max: 5 },
  { value: '6-10', label: 'lv6-10', min: 6, max: 10 },
  { value: '11-15', label: 'lv11-15', min: 11, max: 15 },
  { value: '16-20', label: 'lv16-20', min: 16, max: 20 },
] as const

// Level filter options for epic mode
const EPIC_LEVEL_FILTERS = [
  { value: 'all', label: 'All' },
  { value: '20-22', label: 'lv20-22', min: 20, max: 22 },
  { value: '23-25', label: 'lv23-25', min: 23, max: 25 },
  { value: '26-28', label: 'lv26-28', min: 26, max: 28 },
  { value: '29-30', label: 'lv29-30', min: 29, max: 30 },
] as const

// Saga data interface
interface Saga {
  id: string
  name: string
  levelRange: string
  questCount: number
  adventurePacks: string[]
  quests: string[]
}

type LevelFilterValue = string

export default function QuestSelector({
  packs,
  selectedQuestIds,
  mode,
  onToggleQuest,
  onTogglePack,
}: QuestSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<LevelFilterValue>('all')
  const [patronFilter, setPatronFilter] = useState<string[]>([])
  const [sagaFilter, setSagaFilter] = useState<string[]>([])
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set())

  // Get level filter options based on mode
  const levelFilterOptions = mode === 'heroic' ? HEROIC_LEVEL_FILTERS : EPIC_LEVEL_FILTERS

  // Build saga quest name set for current mode
  const { sagaQuestNames, availableSagas } = useMemo(() => {
    const sagas = mode === 'heroic' ? sagasData.heroic : [...sagasData.epic, ...sagasData.legendary]
    const questNames = new Set<string>()
    if (sagaFilter.length > 0) {
      for (const saga of sagas) {
        if (sagaFilter.includes(saga.name)) {
          saga.quests.forEach((q) => questNames.add(q.toLowerCase()))
        }
      }
    }
    return { sagaQuestNames: questNames, availableSagas: sagas as Saga[] }
  }, [mode, sagaFilter])

  // Extract unique patrons from all quests
  const availablePatrons = useMemo(() => {
    const patrons = new Set<string>()
    for (const pack of packs) {
      for (const quest of pack.quests) {
        if (quest.patron) {
          patrons.add(quest.patron)
        }
      }
    }
    return Array.from(patrons).sort()
  }, [packs])

  // Reset level filter when mode changes if current filter is invalid
  const effectiveLevelFilter = useMemo(() => {
    const validValues = levelFilterOptions.map((f) => f.value)
    if (!validValues.includes(levelFilter as typeof validValues[number])) {
      return 'all' as LevelFilterValue
    }
    return levelFilter
  }, [levelFilter, levelFilterOptions])

  const filteredPacks = useMemo(() => {
    const query = searchQuery.toLowerCase()

    // Get level range inline to avoid dependency issues
    const getLevelRange = (filter: string): { min: number; max: number } | null => {
      const options = mode === 'heroic' ? HEROIC_LEVEL_FILTERS : EPIC_LEVEL_FILTERS
      const option = options.find((f) => f.value === filter)
      if (option && 'min' in option) {
        return { min: option.min, max: option.max }
      }
      return null
    }
    const levelRange = getLevelRange(effectiveLevelFilter)

    return packs
      .map((pack) => {
        // Filter quests based on mode - only show quests that have levels for the current mode
        const filteredQuests = pack.quests.filter((quest) => {
          const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
          // Only show quests that have a level in the current mode
          if (questLevel === null) return false

          // Filter by search query
          if (query && !quest.name.toLowerCase().includes(query) && !pack.name.toLowerCase().includes(query)) {
            return false
          }

          // Filter by level range
          if (levelRange) {
            if (questLevel < levelRange.min || questLevel > levelRange.max) {
              return false
            }
          }

          // Filter by patron
          if (patronFilter.length > 0) {
            if (!quest.patron || !patronFilter.includes(quest.patron)) {
              return false
            }
          }

          // Filter by saga
          if (sagaFilter.length > 0) {
            if (!sagaQuestNames.has(quest.name.toLowerCase())) {
              return false
            }
          }

          return true
        })

        // Sort quests: selected first, then by level
        const sortedQuests = [...filteredQuests].sort((a, b) => {
          const aSelected = selectedQuestIds.has(a.id)
          const bSelected = selectedQuestIds.has(b.id)

          // Selected quests come first
          if (aSelected && !bSelected) return -1
          if (!aSelected && bSelected) return 1

          // Then sort by level
          const levelA = mode === 'heroic' ? a.heroicCR : a.epicCR
          const levelB = mode === 'heroic' ? b.heroicCR : b.epicCR
          return (levelA ?? 0) - (levelB ?? 0)
        })

        // Calculate pack level range for display (based on current mode)
        const levels = sortedQuests
          .map((q) => (mode === 'heroic' ? q.heroicCR : q.epicCR))
          .filter((l): l is number => l !== null)

        return {
          ...pack,
          quests: sortedQuests,
          minLevel: levels.length > 0 ? Math.min(...levels) : null,
          maxLevel: levels.length > 0 ? Math.max(...levels) : null,
        }
      })
      .filter((pack) => pack.quests.length > 0)
      // Sort packs by minimum level
      .sort((a, b) => {
        // Packs with selected quests come first
        const aHasSelected = a.quests.some((q) => selectedQuestIds.has(q.id))
        const bHasSelected = b.quests.some((q) => selectedQuestIds.has(q.id))
        if (aHasSelected && !bHasSelected) return -1
        if (!aHasSelected && bHasSelected) return 1

        // Then by level
        const minA = a.minLevel ?? 999
        const minB = b.minLevel ?? 999
        return minA - minB
      })
  }, [packs, searchQuery, effectiveLevelFilter, mode, selectedQuestIds, patronFilter, sagaFilter, sagaQuestNames])

  const handleLevelFilterChange = (event: SelectChangeEvent) => {
    setLevelFilter(event.target.value)
  }

  const handlePackExpand = (packName: string) => (_: SyntheticEvent, isExpanded: boolean) => {
    setExpandedPacks((prev) => {
      const newSet = new Set(prev)
      if (isExpanded) {
        newSet.add(packName)
      } else {
        newSet.delete(packName)
      }
      return newSet
    })
  }

  const getPackSelectionState = (pack: AdventurePack): 'all' | 'some' | 'none' => {
    const selectedCount = pack.quests.filter((q) => selectedQuestIds.has(q.id)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === pack.quests.length) return 'all'
    return 'some'
  }

  const totalSelected = selectedQuestIds.size
  const totalQuests = filteredPacks.reduce((sum, p) => sum + p.quests.length, 0)

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Quest Selection
      </Typography>

      {/* Search and Filters */}
      <TextField
        size="small"
        placeholder="Search quests or packs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        fullWidth
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Level</InputLabel>
          <Select value={effectiveLevelFilter} label="Level" onChange={handleLevelFilterChange}>
            {levelFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          multiple
          size="small"
          options={availablePatrons}
          value={patronFilter}
          onChange={(_, newValue) => setPatronFilter(newValue)}
          renderInput={(params) => <TextField {...params} label="Patron" placeholder="Filter by patron" />}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
            ))
          }
          sx={{ width: '100%' }}
          limitTags={1}
        />
        <Autocomplete
          multiple
          size="small"
          options={availableSagas}
          getOptionLabel={(option) => `${option.name} (${option.questCount})`}
          value={availableSagas.filter((s) => sagaFilter.includes(s.name))}
          onChange={(_, newValue) => setSagaFilter(newValue.map((s) => s.name))}
          isOptionEqualToValue={(option, value) => option.name === value.name}
          renderInput={(params) => <TextField {...params} label="Saga" placeholder="Filter by saga" />}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={`${option.name} (${option.questCount})`}
                size="small"
              />
            ))
          }
          sx={{ width: '100%' }}
          limitTags={1}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={`${totalSelected} / ${totalQuests} selected`}
          color={totalSelected > 0 ? 'primary' : 'default'}
        />
      </Box>

      {/* Quest List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredPacks.map((pack) => {
          const selectionState = getPackSelectionState(pack)
          const hasSelectedQuests = pack.quests.some((q) => selectedQuestIds.has(q.id))

          return (
            <Accordion
              key={pack.name}
              expanded={expandedPacks.has(pack.name)}
              onChange={handlePackExpand(pack.name)}
              disableGutters
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: hasSelectedQuests ? 'primary.main' : 'divider',
                mb: 0.5,
                bgcolor: hasSelectedQuests ? 'action.selected' : 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
              >
                <FormControlLabel
                  onClick={(e) => e.stopPropagation()}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectionState === 'all'}
                      indeterminate={selectionState === 'some'}
                      onChange={() => onTogglePack(pack.name)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {pack.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={pack.minLevel === pack.maxLevel ? `lv${pack.minLevel ?? '?'}` : `lv${pack.minLevel ?? '?'}-${pack.maxLevel ?? '?'}`}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        ({pack.quests.length})
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                {pack.quests.map((quest) => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    mode={mode}
                    isSelected={selectedQuestIds.has(quest.id)}
                    onToggle={() => onToggleQuest(quest.id)}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          )
        })}

        {filteredPacks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No quests found matching filters
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

interface QuestRowProps {
  quest: QuestWithXP
  mode: PlanMode
  isSelected: boolean
  onToggle: () => void
}

function QuestRow({ quest, mode, isSelected, onToggle }: QuestRowProps) {
  const level = mode === 'heroic' ? quest.heroicCR : quest.epicCR
  const xp =
    mode === 'heroic'
      ? quest.xp.heroic_elite ?? quest.xp.heroic_normal
      : quest.xp.epic_elite ?? quest.xp.epic_normal

  return (
    <FormControlLabel
      control={<Checkbox size="small" checked={isSelected} onChange={onToggle} />}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {quest.name}
          </Typography>
          <Chip
            size="small"
            label={`lv${level}`}
            color={isSelected ? 'primary' : 'default'}
            sx={{ height: 18, fontSize: '0.65rem', minWidth: 35 }}
          />
          {xp && (
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, textAlign: 'right' }}>
              {xp.toLocaleString()}
            </Typography>
          )}
          {quest.groupSize === 'Raid' && (
            <Chip size="small" label="R" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </Box>
      }
      sx={{
        width: '100%',
        ml: 2,
        mr: 0,
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        borderRadius: 1,
      }}
    />
  )
}
