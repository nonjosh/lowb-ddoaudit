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
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
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

import { fetchAreasById, fetchQuestsById, fetchServerCharacters, getCharacterDisplayName, Quest, ServerCharacter } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { useConfig } from '@/contexts/useConfig'

const AUTO_REFRESH_INTERVAL_MS = 10_000

interface LevelBin {
  label: string
  min: number
  max: number
  count: number
  inPartyCount: number
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
  groupId: string
  locationId: string
  locationName: string
  questType: string | null
  quest: Quest | null
  area: { is_public: boolean; is_wilderness: boolean } | null
  count: number
  level: number | null
  characters: ServerCharacter[]
}

interface QuestVersion {
  name: string
  level: number
  type: string | null
  quest: Quest | null
}

function getQuestVersionsForLoc(locId: string, quests: Record<string, Quest>): QuestVersion[] {
  const versions: QuestVersion[] = []
  const seenNames = new Set<string>()

  // Find all unique quest objects associated with this locId
  const matchedQuests = new Set<Quest>()
  for (const q of Object.values(quests)) {
    if (q.id === locId || q.areaId === locId) {
      matchedQuests.add(q)
    }
  }

  if (matchedQuests.size === 0) {
    const fallback = quests[locId]
    if (fallback) {
      versions.push({ name: fallback.name, level: fallback.level ?? 0, type: fallback.type, quest: fallback })
    }
    return versions
  }

  for (const q of matchedQuests) {
    if (q.heroicLevel !== null && q.epicLevel !== null && q.heroicLevel !== q.epicLevel) {
      const hName = `${q.name} (Heroic)`
      const eLabel = q.epicLevel >= 30 ? 'Legendary' : 'Epic'
      const eName = `${q.name} (${eLabel})`

      if (!seenNames.has(hName)) {
        seenNames.add(hName)
        versions.push({ name: hName, level: q.heroicLevel, type: q.type, quest: q })
      }
      if (!seenNames.has(eName)) {
        seenNames.add(eName)
        versions.push({ name: eName, level: q.epicLevel, type: q.type, quest: q })
      }
    } else {
      const level = Math.max(q.heroicLevel ?? 0, q.epicLevel ?? 0, q.level ?? 0)
      if (!seenNames.has(q.name)) {
        seenNames.add(q.name)
        versions.push({ name: q.name, level, type: q.type, quest: q })
      }
    }
  }

  return versions
}

function buildAreaGroups(
  characters: ServerCharacter[],
  areas: FetchState['areas'],
  quests: Record<string, Quest>,
): AreaGroup[] {
  const byLocAndVersion = new Map<string, { group: AreaGroup; chars: ServerCharacter[] }>()

  for (const c of characters) {
    const locId = String(c.location_id)
    const versions = getQuestVersionsForLoc(locId, quests)

    let bestVersion: QuestVersion | null = null
    if (versions.length === 1) {
      bestVersion = versions[0]
    } else if (versions.length > 1) {
      let minDiff = Infinity
      const playerLevel = c.total_level ?? 20
      for (const v of versions) {
        const diff = Math.abs(playerLevel - v.level)
        if (diff < minDiff) {
          minDiff = diff
          bestVersion = v
        }
      }
    }

    const groupId = bestVersion ? `${locId}__${bestVersion.name}` : `${locId}__default`
    const existing = byLocAndVersion.get(groupId)

    if (existing) {
      existing.chars.push(c)
    } else {
      const area = areas[locId] ?? null
      const defaultQuest = quests[locId] ?? null
      const locationName = bestVersion?.name ?? defaultQuest?.name ?? area?.name ?? `Unknown (${locId})`

      byLocAndVersion.set(groupId, {
        group: {
          groupId,
          locationId: locId,
          locationName,
          questType: bestVersion?.type ?? defaultQuest?.type ?? null,
          quest: bestVersion?.quest ?? defaultQuest,
          area,
          count: 0,
          level: bestVersion?.level ?? defaultQuest?.level ?? null,
          characters: [],
        },
        chars: [c],
      })
    }
  }

  const groups: AreaGroup[] = []
  for (const { group, chars } of byLocAndVersion.values()) {
    group.count = chars.length
    group.characters = chars
    groups.push(group)
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
      { label: '1-4', min: 1, max: 4, count: 0, inPartyCount: 0 },
      { label: '5-9', min: 5, max: 9, count: 0, inPartyCount: 0 },
      { label: '10-14', min: 10, max: 14, count: 0, inPartyCount: 0 },
      { label: '15-19', min: 15, max: 19, count: 0, inPartyCount: 0 },
      { label: '20-24', min: 20, max: 24, count: 0, inPartyCount: 0 },
      { label: '25-29', min: 25, max: 29, count: 0, inPartyCount: 0 },
      { label: '30-34', min: 30, max: 34, count: 0, inPartyCount: 0 },
    ]
    for (const c of characters) {
      const lvl = c.total_level
      for (const bin of bins) {
        if (lvl >= bin.min && lvl <= bin.max) {
          bin.count++
          if (c.is_in_party) {
            bin.inPartyCount++
          }
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
        <Box component="span" sx={{ float: 'right', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">In Party</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'divider', borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">Solo</Typography>
          </Stack>
        </Box>
        {hasFilter && (
          <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1, display: 'block' }}>
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
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                opacity: dimmed ? 0.35 : 1,
                transition: 'opacity 0.2s',
                '&:hover .bar-label': { opacity: 1 }
              }}
            >
              <Typography variant="caption" sx={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
                {bin.label}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Tooltip
                  title={
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>{bin.count} players</Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>{bin.inPartyCount} In Party ({Math.round(bin.inPartyCount / Math.max(bin.count, 1) * 100)}%)</Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>{bin.count - bin.inPartyCount} Solo</Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', opacity: 0.8 }}>
                        click to {isSelected ? 'deselect' : 'select'}
                      </Typography>
                    </Box>
                  }
                >
                  <Box
                    sx={{
                      height: 18,
                      width: `${(bin.count / maxCount) * 100}%`,
                      display: 'flex',
                      minWidth: bin.count > 0 ? 4 : 0,
                      borderRadius: 0.5,
                      overflow: 'hidden',
                      transition: 'width 0.3s ease',
                      outline: isSelected ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: 1,
                    }}
                  >
                    {bin.inPartyCount > 0 && (
                      <Box
                        sx={{
                          width: `${(bin.inPartyCount / bin.count) * 100}%`,
                          bgcolor: bin.min >= 30 ? 'warning.main' : bin.min >= 20 ? 'info.main' : 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {(bin.inPartyCount / maxCount) > 0.05 && (
                          <Typography className="bar-label" variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', fontWeight: 'bold', opacity: 0, transition: 'opacity 0.2s' }}>
                            {bin.inPartyCount}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {bin.count - bin.inPartyCount > 0 && (
                      <Box
                        sx={{
                          width: `${((bin.count - bin.inPartyCount) / bin.count) * 100}%`,
                          bgcolor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {((bin.count - bin.inPartyCount) / maxCount) > 0.05 && (
                          <Typography className="bar-label" variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 'bold', opacity: 0, transition: 'opacity 0.2s' }}>
                            {bin.count - bin.inPartyCount}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
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
  const { showClassIcons } = useConfig()

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
                <TableRow key={g.groupId}>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {g.locationName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {g.level ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip
                      arrow
                      placement="left"
                      slotProps={{ tooltip: { sx: { maxWidth: 'none' } } }}
                      title={
                        <Stack spacing={1} sx={{ p: 0.5 }}>
                          {[...g.characters].sort((a, b) => {
                            const gA = a.guild_name ?? ''
                            const gB = b.guild_name ?? ''
                            if (gA !== gB) return gA.localeCompare(gB)
                            return b.total_level - a.total_level
                          }).map((c) => (
                            <Stack key={c.id} direction="row" spacing={1.5} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {getCharacterDisplayName(c.name, { isAnonymous: c.is_anonymous })}
                              </Typography>
                              {c.guild_name && (
                                <Typography variant="caption" color="text.secondary">&lt;{c.guild_name}&gt;</Typography>
                              )}
                              <Typography variant="caption" sx={{ ml: 'auto' }}>Lv {c.total_level}</Typography>
                              <ClassDisplay classes={c.classes} showIcons={showClassIcons} iconSize={16} />
                            </Stack>
                          ))}
                        </Stack>
                      }
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          cursor: 'help',
                          textDecoration: 'underline dotted',
                          textUnderlineOffset: 2,
                          textDecorationColor: 'text.secondary',
                        }}
                      >
                        {g.count}
                      </Typography>
                    </Tooltip>
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
  const [showSoloOnly, setShowSoloOnly] = useState(false)
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

  const visibleCharacters = useMemo(
    () => (showSoloOnly ? state.characters.filter((character) => !character.is_in_party) : state.characters),
    [showSoloOnly, state.characters],
  )

  // Build the selected level ranges from bin labels for filtering
  const selectedLevelRanges = useMemo(() => {
    if (selectedBins.size === 0) return null
    const LEVEL_BINS: LevelBin[] = [
      { label: '1-4', min: 1, max: 4, count: 0, inPartyCount: 0 },
      { label: '5-9', min: 5, max: 9, count: 0, inPartyCount: 0 },
      { label: '10-14', min: 10, max: 14, count: 0, inPartyCount: 0 },
      { label: '15-19', min: 15, max: 19, count: 0, inPartyCount: 0 },
      { label: '20-24', min: 20, max: 24, count: 0, inPartyCount: 0 },
      { label: '25-29', min: 25, max: 29, count: 0, inPartyCount: 0 },
      { label: '30-34', min: 30, max: 34, count: 0, inPartyCount: 0 },
    ]
    return LEVEL_BINS.filter((b) => selectedBins.has(b.label))
  }, [selectedBins])

  const allAreaGroups = useMemo(
    () => buildAreaGroups(visibleCharacters, state.areas, state.quests),
    [state.areas, state.quests, visibleCharacters],
  )

  // Filter area groups by selected level ranges
  const filteredAreaGroups = useMemo(() => {
    if (!selectedLevelRanges) return allAreaGroups

    return allAreaGroups
      .flatMap((group) => {
        const characters = group.characters.filter((character) =>
          selectedLevelRanges.some(
            (range) => character.total_level >= range.min && character.total_level <= range.max,
          ),
        )

        if (characters.length === 0) {
          return []
        }

        return [{ ...group, characters, count: characters.length }]
      })
      .sort((a, b) => b.count - a.count)
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
                {state.loading && state.characters.length > 0 ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {state.loading && state.characters.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}
        {state.characters.length > 0 && (
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="flex-end">
              <FormControlLabel
                control={
                  <Switch
                    checked={showSoloOnly}
                    onChange={(_, checked) => setShowSoloOnly(checked)}
                    size="small"
                  />
                }
                label="Solo only"
                sx={{ mr: 0 }}
              />
            </Stack>
            <LevelDistributionChart
              characters={visibleCharacters}
              selectedBins={selectedBins}
              onToggleBin={handleToggleBin}
            />
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
