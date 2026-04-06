import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { fetchAreasById, fetchQuestsById, fetchServerCharacters, Quest, ServerCharacter } from '@/api/ddoAudit'

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
      return { characters: action.characters, areas: action.areas, quests: action.quests, loading: false, error: null }
    case 'error':
      return { ...state, loading: false, error: action.error }
  }
}

interface AreaGroup {
  locationId: string
  locationName: string
  questType: string | null
  quest: Quest | null
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
      count: chars.length,
    })
  }

  groups.sort((a, b) => b.count - a.count)
  return groups
}

function LevelDistributionChart({ characters }: { characters: ServerCharacter[] }) {
  const buckets = useMemo(() => {
    const bins: { label: string; min: number; max: number; count: number }[] = [
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

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Level Distribution ({characters.length} players)
      </Typography>
      <Stack spacing={0.5}>
        {buckets.map((bin) => (
          <Stack key={bin.label} direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" sx={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
              {bin.label}
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <Tooltip title={`${bin.count} players`}>
                <Box
                  sx={{
                    height: 18,
                    width: `${(bin.count / maxCount) * 100}%`,
                    minWidth: bin.count > 0 ? 4 : 0,
                    bgcolor: bin.min >= 30 ? 'warning.main' : bin.min >= 20 ? 'info.main' : 'success.main',
                    borderRadius: 0.5,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Tooltip>
              <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                {bin.count}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
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
  })

  const fetchData = useCallback(async () => {
    dispatch({ type: 'start' })
    try {
      const [characters, areas, quests] = await Promise.all([
        fetchServerCharacters('shadowdale'),
        fetchAreasById(),
        fetchQuestsById(),
      ])
      dispatch({ type: 'success', characters, areas, quests })
    } catch (e) {
      const error = e as Error
      dispatch({ type: 'error', error: error?.message ?? String(e) })
    }
  }, [])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  const allAreaGroups = useMemo(
    () => buildAreaGroups(state.characters, state.areas, state.quests),
    [state.characters, state.areas, state.quests],
  )

  const raidGroups = useMemo(
    () => allAreaGroups.filter((g) => g.questType?.toLowerCase() === 'raid'),
    [allAreaGroups],
  )

  const questGroups = useMemo(
    () => allAreaGroups.filter((g) => g.questType && g.questType.toLowerCase() !== 'raid'),
    [allAreaGroups],
  )

  const otherGroups = useMemo(
    () => allAreaGroups.filter((g) => !g.questType),
    [allAreaGroups],
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Shadowdale Server — Player Statistics
        </Typography>
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
            <LevelDistributionChart characters={state.characters} />
            <AreaGroupsTable title="Raid Areas" groups={raidGroups} defaultExpanded />
            <AreaGroupsTable title="Quest Areas" groups={questGroups} defaultExpanded={false} />
            <AreaGroupsTable title="Other Areas" groups={otherGroups} defaultExpanded={false} />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
