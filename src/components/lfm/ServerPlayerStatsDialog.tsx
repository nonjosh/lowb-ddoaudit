import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { fetchAreasById, fetchQuestsById, fetchServerCharacters, Quest, ServerCharacter } from '@/api/ddoAudit'

const AUTO_REFRESH_INTERVAL_MS = 10_000

interface LevelBin {
  label: string
  min: number
  max: number
  count: number
}

interface ServerPlayerStatsDialogProps {
  open: boolean
  onClose: () => void
}

interface FetchState {
  characters: ServerCharacter[]
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  quests: Record<string, Quest>
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

type FetchAction =
  | { type: 'start' }
  | { type: 'success'; characters: ServerCharacter[]; areas: FetchState['areas']; quests: FetchState['quests'] }
  | { type: 'error'; error: string }

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true, error: null }
    case 'success':
      return { characters: action.characters, areas: action.areas, quests: action.quests, loading: false, error: null, lastUpdated: new Date() }
    case 'error':
      return { ...state, loading: false, error: action.error }
  }
}

interface AreaGroup {
  locationId: string
  locationName: string
  questType: string | null
  quest: Quest | null
  area: { is_public: boolean; is_wilderness: boolean } | null
  count: number
}

function buildAreaGroups(
  characters: ServerCharacter[],
  areas: FetchState['areas'],
  quests: Record<string, Quest>,
): AreaGroup[] {
  const byLocation = new Map<string, ServerCharacter[]>()
  for (const c of characters) {
    const locId = String(c.location_id)
    const list = byLocation.get(locId)
    if (list) list.push(c)
    else byLocation.set(locId, [c])
  }

  const groups: AreaGroup[] = []
  for (const [locId, chars] of byLocation) {
    const quest = quests[locId] ?? null
    const area = areas[locId] ?? null
    const locationName = quest?.name ?? area?.name ?? `Unknown (${locId})`
    const questType = quest?.type ?? null
    groups.push({
      locationId: locId,
      locationName,
      questType,
      quest,
      area,
      count: chars.length,
    })
  }

  groups.sort((a, b) => b.count - a.count)
  return groups
}

function LevelDistributionChart({
  characters,
  selectedBins,
  onToggleBin,
}: {
  characters: ServerCharacter[]
  selectedBins: Set<string>
  onToggleBin: (label: string) => void
}) {
  const buckets = useMemo(() => {
    const bins: LevelBin[] = [
      { label: '1-4', min: 1, max: 4, count: 0 },
      { label: '5-9', min: 5, max: 9, count: 0 },
      { label: '10-14', min: 10, max: 14, count: 0 },
      { label: '15-19', min: 15, max: 19, count: 0 },
      { label: '20-24', min: 20, max: 24, count: 0 },
      { label: '25-29', min: 25, max: 29, count: 0 },
      { label: '30-34', min: 30, max: 34, count: 0 },
    ]
    for (const c of characters) {
      const lvl = c.total_level
      for (const bin of bins) {
        if (lvl >= bin.min && lvl <= bin.max) {
          bin.count++
          break
        }
      }
    }
    return bins
  }, [characters])

  const maxCount = Math.max(...buckets.map((b) => b.count), 1)
  const hasFilter = selectedBins.size > 0

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Level Distribution ({characters.length} players)
        {hasFilter && (
          <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
            — click bars to filter areas
          </Typography>
        )}
      </Typography>
      <Stack spacing={0.5}>
        {buckets.map((bin) => {
          const isSelected = selectedBins.has(bin.label)
          const dimmed = hasFilter && !isSelected
          return (
            <Stack
              key={bin.label}
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={() => onToggleBin(bin.label)}
              sx={{ cursor: 'pointer', userSelect: 'none', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.2s' }}
            >
              <Typography variant="caption" sx={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
                {bin.label}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Tooltip title={`${bin.count} players — click to ${isSelected ? 'deselect' : 'select'}`}>
                  <Box
                    sx={{
                      height: 18,
                      width: `${(bin.count / maxCount) * 100}%`,
                      minWidth: bin.count > 0 ? 4 : 0,
                      bgcolor: bin.min >= 30 ? 'warning.main' : bin.min >= 20 ? 'info.main' : 'success.main',
                      borderRadius: 0.5,
                      transition: 'width 0.3s ease',
                      outline: isSelected ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: 1,
                    }}
                  />
                </Tooltip>
                <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                  {bin.count}
                </Typography>
              </Box>
            </Stack>
          )
        })}
      </Stack>
      {hasFilter && (
        <Typography
          variant="caption"
          color="primary.main"
          onClick={() => { for (const label of selectedBins) onToggleBin(label) }}
          sx={{ cursor: 'pointer', mt: 0.5, display: 'inline-block' }}
        >
          Clear filter
        </Typography>
      )}
    </Box>
  )
}

function AreaGroupsTable({
  title,
  groups,
  defaultExpanded,
}: {
  title: string
  groups: AreaGroup[]
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const totalPlayers = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups])

  if (groups.length === 0) return null

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setExpanded(!expanded)}
        sx={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        <Typography variant="subtitle2">
          {title} ({groups.length} areas, {totalPlayers} players)
        </Typography>
      </Stack>
      <Collapse in={expanded}>
        <TableContainer component={Box} sx={{ mt: 0.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Area</TableCell>
                <TableCell align="right" sx={{ width: 72 }}>Level</TableCell>
                <TableCell align="right" sx={{ width: 72 }}>Players</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.locationId}>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {g.locationName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {g.quest?.level ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {g.count}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  )
}

export default function ServerPlayerStatsDialog({ open, onClose }: ServerPlayerStatsDialogProps) {
  const [state, dispatch] = useReducer(fetchReducer, {
    characters: [],
    areas: {},
    quests: {},
    loading: false,
    error: null,
    lastUpdated: null,
  })
  const [selectedBins, setSelectedBins] = useState<Set<string>>(new Set())
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    dispatch({ type: 'start' })
    try {
      const [characters, areas, quests] = await Promise.all([
        fetchServerCharacters('shadowdale'),
        fetchAreasById(),
        fetchQuestsById(),
      ])
      // Only keep online characters for this dialog
      const onlineCharacters = characters.filter((c) => c.is_online)
      dispatch({ type: 'success', characters: onlineCharacters, areas, quests })
    } catch (e) {
      const error = e as Error
      dispatch({ type: 'error', error: error?.message ?? String(e) })
    }
  }, [])

  // Initial fetch + auto-refresh every 10s while dialog is open
  useEffect(() => {
    if (!open) return
    void fetchData()
    autoRefreshRef.current = setInterval(() => { void fetchData() }, AUTO_REFRESH_INTERVAL_MS)
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [open, fetchData])

  const handleToggleBin = useCallback((label: string) => {
    setSelectedBins((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  // Build the selected level ranges from bin labels for filtering
  const selectedLevelRanges = useMemo(() => {
    if (selectedBins.size === 0) return null
    const LEVEL_BINS: LevelBin[] = [
      { label: '1-4', min: 1, max: 4, count: 0 },
      { label: '5-9', min: 5, max: 9, count: 0 },
      { label: '10-14', min: 10, max: 14, count: 0 },
      { label: '15-19', min: 15, max: 19, count: 0 },
      { label: '20-24', min: 20, max: 24, count: 0 },
      { label: '25-29', min: 25, max: 29, count: 0 },
      { label: '30-34', min: 30, max: 34, count: 0 },
    ]
    return LEVEL_BINS.filter((b) => selectedBins.has(b.label))
  }, [selectedBins])

  const allAreaGroups = useMemo(
    () => buildAreaGroups(state.characters, state.areas, state.quests),
    [state.characters, state.areas, state.quests],
  )

  // Filter area groups by selected level ranges
  const filteredAreaGroups = useMemo(() => {
    if (!selectedLevelRanges) return allAreaGroups
    return allAreaGroups.filter((g) => {
      const level = g.quest?.level
      if (typeof level !== 'number') return false
      return selectedLevelRanges.some((r) => level >= r.min && level <= r.max)
    })
  }, [allAreaGroups, selectedLevelRanges])

  const raidGroups = useMemo(
    () => filteredAreaGroups.filter((g) => g.questType?.toLowerCase() === 'raid'),
    [filteredAreaGroups],
  )

  const questGroups = useMemo(
    () => filteredAreaGroups.filter((g) => g.questType && g.questType.toLowerCase() !== 'raid').sort((a, b) => {
      const aLevel = typeof a.quest?.level === 'number' ? a.quest.level : -1
      const bLevel = typeof b.quest?.level === 'number' ? b.quest.level : -1
      if (aLevel !== bLevel) return bLevel - aLevel // descending level
      return b.count - a.count // tie break by count
    }),
    [filteredAreaGroups],
  )

  const wildernessGroups = useMemo(
    () => filteredAreaGroups.filter((g) => !g.questType && g.area?.is_wilderness),
    [filteredAreaGroups],
  )

  const publicGroups = useMemo(
    () => filteredAreaGroups.filter((g) => !g.questType && !g.area?.is_wilderness && g.area?.is_public),
    [filteredAreaGroups],
  )

  const otherGroups = useMemo(
    () => filteredAreaGroups.filter((g) => !g.questType && !g.area?.is_wilderness && !g.area?.is_public),
    [filteredAreaGroups],
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Shadowdale Server — Online Players
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {state.lastUpdated && (
              <Typography variant="caption" color="text.secondary">
                Updated: {state.lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={fetchData} disabled={state.loading} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {state.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}
        {!state.loading && state.characters.length > 0 && (
          <Stack spacing={3}>
            <LevelDistributionChart characters={state.characters} selectedBins={selectedBins} onToggleBin={handleToggleBin} />
            <AreaGroupsTable title="Raid Areas" groups={raidGroups} defaultExpanded />
            <AreaGroupsTable title="Quest Areas" groups={questGroups} defaultExpanded={false} />
            <AreaGroupsTable title="Wilderness Areas" groups={wildernessGroups} defaultExpanded={false} />
            <AreaGroupsTable title="Public Areas" groups={publicGroups} defaultExpanded={false} />
            <AreaGroupsTable title="Other Areas" groups={otherGroups} defaultExpanded={false} />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
