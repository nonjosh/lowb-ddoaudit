import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SearchIcon from '@mui/icons-material/Search'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { SyntheticEvent, useMemo, useState } from 'react'

import sagasData from '@/data/sagas.json'
import { AdventurePack, QuestWithXP } from '@/contexts/useTRPlanner'
import { useWishlist } from '@/contexts/useWishlist'
import { PlanMode } from '@/domains/trPlanner/levelRequirements'

interface QuestSelectorProps {
  packs: AdventurePack[]
  selectedQuestIds: Set<string>
  selectedPackNames: Set<string>
  completedQuestIds: Set<string>
  otherModeSelectedQuestIds?: Set<string> // Quests selected in other epic/etr mode (for mutual exclusion)
  mode: PlanMode
  sagaFilter: string[]
  onToggleQuest: (questId: string) => void
  onTogglePack: (packName: string, filteredQuestIds?: string[], forceSelect?: boolean) => void
  onToggleQuestCompletion: (questId: string) => void
  onSetSagaFilter: (sagas: string[]) => void
}

// Saga data interface
interface Saga {
  id: string
  name: string
  levelRange: string
  questCount: number
  adventurePacks: string[]
  quests: string[]
}

export default function QuestSelector({
  packs,
  selectedQuestIds,
  completedQuestIds,
  otherModeSelectedQuestIds,
  mode,
  sagaFilter,
  onToggleQuest,
  onTogglePack,
  onToggleQuestCompletion,
  onSetSagaFilter,
}: QuestSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [patronFilter, setPatronFilter] = useState<string[]>([])
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set())

  const { hasWishForQuestName } = useWishlist()

  // Build saga quest name set for current mode
  const { sagaQuestNames, availableSagas } = useMemo(() => {
    const sagas = mode === 'heroic' ? sagasData.heroic : [...sagasData.epic, ...sagasData.legendary]
    const questNames = new Set<string>()
    if (sagaFilter.length > 0) {
      for (const saga of sagas) {
        if (sagaFilter.includes(saga.name)) {
          // Add exact quest names and also try to match partial names
          for (const questName of saga.quests) {
            questNames.add(questName.toLowerCase())
            // Also add without "The " prefix for matching
            if (questName.toLowerCase().startsWith('the ')) {
              questNames.add(questName.toLowerCase().substring(4))
            }
          }
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

  const filteredPacks = useMemo(() => {
    const query = searchQuery.toLowerCase()

    return packs
      .map((pack) => {
        // Filter quests based on mode - only show quests that have levels for the current mode
        const filteredQuests = pack.quests.filter((quest) => {
          const questLevel = mode === 'heroic' ? quest.heroicCR : quest.epicCR
          // Only show quests that have a level in the current mode
          if (questLevel === null) return false

          // In epic/etr modes, exclude quests selected in the other mode (mutual exclusion)
          if (otherModeSelectedQuestIds?.has(quest.id)) return false

          // Filter by search query
          if (query && !quest.name.toLowerCase().includes(query) && !pack.name.toLowerCase().includes(query)) {
            return false
          }

          // Filter by patron
          if (patronFilter.length > 0) {
            if (!quest.patron || !patronFilter.includes(quest.patron)) {
              return false
            }
          }

          // Filter by saga
          if (sagaFilter.length > 0) {
            const questNameLower = quest.name.toLowerCase()
            // Check exact match or match without "The " prefix
            const nameWithoutThe = questNameLower.startsWith('the ') ? questNameLower.substring(4) : questNameLower
            if (!sagaQuestNames.has(questNameLower) && !sagaQuestNames.has(nameWithoutThe)) {
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
      // Sort packs by minimum level only (no longer pinning selected packs)
      .sort((a, b) => {
        const minA = a.minLevel ?? 999
        const minB = b.minLevel ?? 999
        return minA - minB
      })
  }, [packs, searchQuery, mode, selectedQuestIds, patronFilter, sagaFilter, sagaQuestNames, otherModeSelectedQuestIds])
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
          onChange={(_, newValue) => onSetSagaFilter(newValue.map((s) => s.name))}
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

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={`${totalSelected} selected`}
          color={totalSelected > 0 ? 'primary' : 'default'}
        />
        <Chip
          size="small"
          label={`${totalQuests} shown`}
          variant="outlined"
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
                sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center' } }}
              >
                <Checkbox
                  size="small"
                  checked={selectionState === 'all'}
                  indeterminate={selectionState === 'some'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onTogglePack(pack.name, pack.quests.map((q) => q.id))}
                  sx={{ p: 0.5, mr: 1 }}
                />
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
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                {pack.quests.map((quest) => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    mode={mode}
                    isSelected={selectedQuestIds.has(quest.id)}
                    isCompleted={completedQuestIds.has(quest.id)}
                    hasWishlistItem={hasWishForQuestName(quest.name)}
                    onToggle={() => onToggleQuest(quest.id)}
                    onToggleCompletion={() => onToggleQuestCompletion(quest.id)}
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
  isCompleted: boolean
  hasWishlistItem: boolean
  onToggle: () => void
  onToggleCompletion: () => void
}

function QuestRow({ quest, mode, isSelected, isCompleted, hasWishlistItem, onToggle, onToggleCompletion }: QuestRowProps) {
  const level = mode === 'heroic' ? quest.heroicCR : quest.epicCR
  const xp =
    mode === 'heroic'
      ? quest.xp.heroic_elite ?? quest.xp.heroic_normal
      : quest.xp.epic_elite ?? quest.xp.epic_normal

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        ml: 2,
        mr: 0,
        bgcolor: isCompleted ? 'success.main' : isSelected ? 'action.selected' : 'transparent',
        borderRadius: 1,
        opacity: isCompleted ? 0.7 : 1,
        '&:hover': { bgcolor: isCompleted ? 'success.dark' : 'action.hover' },
      }}
    >
      <Checkbox size="small" checked={isSelected} onChange={onToggle} sx={{ p: 0.5 }} />
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, cursor: isSelected ? 'pointer' : 'default', py: 0.5 }}
        onClick={isSelected ? onToggleCompletion : undefined}
        title={isSelected ? (isCompleted ? 'Click to mark incomplete' : 'Click to mark completed') : undefined}
      >
        {hasWishlistItem && (
          <Tooltip title="Has wishlist item" arrow>
            <FavoriteIcon sx={{ fontSize: 14, color: 'error.main' }} />
          </Tooltip>
        )}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 0,
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
          noWrap
        >
          {isCompleted && '✓ '}{quest.name}
        </Typography>
        <Chip
          size="small"
          label={`lv${level}`}
          color={isCompleted ? 'success' : isSelected ? 'primary' : 'default'}
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
    </Box>
  )
}
