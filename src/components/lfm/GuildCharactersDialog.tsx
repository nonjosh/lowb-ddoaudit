import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GroupsIcon from '@mui/icons-material/Groups'
import ListAltIcon from '@mui/icons-material/ListAlt'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Chip,
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

import { fetchAreasById, fetchGuildCharacters, fetchQuestsById, GuildCharacter, Quest } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useConfig } from '@/contexts/useConfig'
import { useLfm } from '@/contexts/useLfm'
import { createLfmByCharacterNameMap, LfmDisplayData, normalizeLfm } from '@/domains/lfm/lfmHelpers'
import { getPlayerName } from '@/domains/raids/raidLogic'

interface GuildCharactersDialogProps {
  guildName: string | null
  serverName: string
  onClose: () => void
  onLfmClick?: (lfm: LfmDisplayData) => void
}

interface AreaInfo {
  name: string
  is_public?: boolean
  is_wilderness?: boolean
}

interface FetchState {
  characters: GuildCharacter[]
  areas: Record<string, AreaInfo>
  quests: Record<string, Quest>
  loading: boolean
  error: string | null
}

type FetchAction =
  | { type: 'start' }
  | { type: 'success'; characters: GuildCharacter[]; areas: Record<string, AreaInfo>; quests: Record<string, Quest> }
  | { type: 'error'; error: string }

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'start':
      return { characters: [], areas: state.areas, quests: state.quests, loading: true, error: null }
    case 'success':
      return { characters: action.characters, areas: action.areas, quests: action.quests, loading: false, error: null }
    case 'error':
      return { ...state, loading: false, error: action.error }
  }
}

type LocationCategory = 'quest' | 'wilderness' | 'public'

interface LocationGroup {
  locationId: string
  locationName: string
  category: LocationCategory
  quest?: Quest
  area?: AreaInfo
  characters: GuildCharacter[]
  maxLevel: number
}

function sortCharsInGroup(chars: GuildCharacter[]): GuildCharacter[] {
  return [...chars].sort((a, b) => {
    const aKnown = EXPECTED_PLAYERS.includes(getPlayerName(a.name)) ? 0 : 1
    const bKnown = EXPECTED_PLAYERS.includes(getPlayerName(b.name)) ? 0 : 1
    if (aKnown !== bKnown) return aKnown - bKnown
    if (b.total_level !== a.total_level) return b.total_level - a.total_level
    return a.name.localeCompare(b.name)
  })
}

function buildLocationGroups(
  characters: GuildCharacter[],
  areas: Record<string, AreaInfo>,
  quests: Record<string, Quest>,
): { questGroups: LocationGroup[]; wildernessGroups: LocationGroup[]; publicGroups: LocationGroup[] } {
  const groupMap = new Map<string, LocationGroup>()

  for (const c of characters) {
    const locId = String(c.location_id)
    let group = groupMap.get(locId)
    if (!group) {
      const quest = quests[locId]
      const area = areas[locId]
      let category: LocationCategory = 'public'
      if (quest) category = 'quest'
      else if (area?.is_wilderness) category = 'wilderness'
      group = {
        locationId: locId,
        locationName: quest?.name || area?.name || 'Unknown',
        category,
        quest,
        area,
        characters: [],
        maxLevel: 0,
      }
      groupMap.set(locId, group)
    }
    group.characters.push(c)
    group.maxLevel = Math.max(group.maxLevel, c.total_level)
  }

  for (const group of groupMap.values()) {
    group.characters = sortCharsInGroup(group.characters)
  }

  const sortByMaxLevel = (groups: LocationGroup[]) =>
    groups.sort((a, b) => b.maxLevel - a.maxLevel || a.locationName.localeCompare(b.locationName))

  const allGroups = Array.from(groupMap.values())
  return {
    questGroups: sortByMaxLevel(allGroups.filter(g => g.category === 'quest')),
    wildernessGroups: sortByMaxLevel(allGroups.filter(g => g.category === 'wilderness')),
    publicGroups: sortByMaxLevel(allGroups.filter(g => g.category === 'public')),
  }
}

/* ---------- Collapsible location group ---------- */

interface CollapsibleLocationGroupProps {
  group: LocationGroup
  showClassIcons: boolean
  lfmByCharacterName: Map<string, LfmDisplayData>
  defaultExpanded?: boolean
  onLfmClick?: (lfm: LfmDisplayData) => void
}

function CollapsibleLocationGroup({
  group,
  showClassIcons,
  lfmByCharacterName,
  defaultExpanded = true,
  onLfmClick,
}: CollapsibleLocationGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const questLevelLabel = group.quest
    ? [
      group.quest.heroicLevel != null ? `H${group.quest.heroicLevel}` : null,
      group.quest.epicLevel != null ? `E${group.quest.epicLevel}` : null,
    ].filter(Boolean).join(' / ')
    : null

  return (
    <>
      <TableRow
        onClick={() => setExpanded(!expanded)}
        sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
      >
        <TableCell colSpan={4}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            <Typography variant="subtitle2" fontWeight="bold">
              {group.locationName}
            </Typography>
            {questLevelLabel && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                ({questLevelLabel})
              </Typography>
            )}
            {group.quest?.required_adventure_pack && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                — {group.quest.required_adventure_pack}
              </Typography>
            )}
            <Chip size="small" label={group.characters.length} />
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ p: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {group.characters.map((c) => {
                  const playerName = getPlayerName(c.name)
                  const isKnown = EXPECTED_PLAYERS.includes(playerName)
                  const charLfm = lfmByCharacterName.get(c.name)
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" noWrap>{c.name}</Typography>
                          {isKnown && (
                            <Chip size="small" color="success" label={playerName} />
                          )}
                          {c.is_in_party && (
                            <Tooltip title="In Party">
                              <GroupsIcon color="action" sx={{ width: 16, height: 16 }} />
                            </Tooltip>
                          )}
                          {charLfm && (
                            <Tooltip title="In LFM (Click to view)">
                              <ListAltIcon
                                color="action"
                                sx={{ width: 16, height: 16, cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onLfmClick) onLfmClick(charLfm)
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{c.total_level}</TableCell>
                      <TableCell>
                        <ClassDisplay classes={c.classes} showIcons={showClassIcons} />
                      </TableCell>
                      <TableCell>{c.race}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

/* ---------- Category section header ---------- */

function CategoryHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <TableRow>
      <TableCell colSpan={4} sx={{ bgcolor: 'background.default', py: 0.5 }}>
        <Typography variant="overline" fontWeight="bold">
          {label} ({count})
        </Typography>
      </TableCell>
    </TableRow>
  )
}

/* ---------- Main dialog ---------- */

const initialState: FetchState = { characters: [], areas: {}, quests: {}, loading: false, error: null }

export default function GuildCharactersDialog({ guildName, serverName, onClose, onLfmClick }: GuildCharactersDialogProps) {
  const { showClassIcons } = useConfig()
  const { lfms: lfmsById } = useLfm()
  const [state, dispatch] = useReducer(fetchReducer, initialState)
  const { characters, areas, quests, loading, error } = state

  const lfmByCharacterName = useMemo(() => {
    const map: Record<string, LfmDisplayData> = {}
    Object.entries(lfmsById ?? {}).forEach(([id, lfm]) => {
      const quest = quests[String(lfm.quest_id)] ?? null
      const norm = normalizeLfm(lfm, quest)
      if (norm) map[id] = norm
    })
    return createLfmByCharacterNameMap(map)
  }, [lfmsById, quests])

  const { questGroups, wildernessGroups, publicGroups } = useMemo(
    () => characters.length > 0
      ? buildLocationGroups(characters, areas, quests)
      : { questGroups: [], wildernessGroups: [], publicGroups: [] },
    [characters, areas, quests],
  )

  const fetchData = useCallback((guild: string, server: string, signal: AbortSignal) => {
    dispatch({ type: 'start' })
    Promise.all([
      fetchGuildCharacters(server, guild, signal),
      fetchAreasById(),
      fetchQuestsById(),
    ])
      .then(([chars, areasData, questsData]) => {
        if (signal.aborted) return
        dispatch({ type: 'success', characters: chars, areas: areasData, quests: questsData })
      })
      .catch((err) => {
        if (!signal.aborted) {
          dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Failed to fetch guild characters' })
        }
      })
  }, [])

  useEffect(() => {
    if (!guildName) return
    const controller = new AbortController()
    fetchData(guildName, serverName, controller.signal)
    return () => controller.abort()
  }, [guildName, serverName, fetchData])

  const ddoAuditUrl = guildName
    ? `https://www.ddoaudit.com/guilds/${encodeURIComponent(serverName)}/${encodeURIComponent(guildName.toLowerCase())}`
    : ''

  return (
    <Dialog open={!!guildName} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          {guildName}
        </Typography>
        <Chip
          icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', ml: 1 }} />}
          label={`${characters.length} Online`}
          size="small"
          variant="outlined"
        />
        {loading && <CircularProgress size={20} />}
        {ddoAuditUrl && (
          <Tooltip title="View on DDO Audit">
            <IconButton
              size="small"
              component="a"
              href={ddoAuditUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'text.secondary' }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && characters.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No online characters found.
          </Typography>
        )}
        {characters.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Level</TableCell>
                  <TableCell>Classes</TableCell>
                  <TableCell>Race</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questGroups.length > 0 && (
                  <>
                    <CategoryHeader label="Quests" count={questGroups.reduce((s, g) => s + g.characters.length, 0)} />
                    {questGroups.map((g) => (
                      <CollapsibleLocationGroup
                        key={g.locationId}
                        group={g}
                        showClassIcons={showClassIcons}
                        lfmByCharacterName={lfmByCharacterName}
                        onLfmClick={onLfmClick}
                      />
                    ))}
                  </>
                )}
                {wildernessGroups.length > 0 && (
                  <>
                    <CategoryHeader label="Wilderness" count={wildernessGroups.reduce((s, g) => s + g.characters.length, 0)} />
                    {wildernessGroups.map((g) => (
                      <CollapsibleLocationGroup
                        key={g.locationId}
                        group={g}
                        showClassIcons={showClassIcons}
                        lfmByCharacterName={lfmByCharacterName}
                        onLfmClick={onLfmClick}
                      />
                    ))}
                  </>
                )}
                {publicGroups.length > 0 && (
                  <>
                    <CategoryHeader label="Public Areas" count={publicGroups.reduce((s, g) => s + g.characters.length, 0)} />
                    {publicGroups.map((g) => (
                      <CollapsibleLocationGroup
                        key={g.locationId}
                        group={g}
                        showClassIcons={showClassIcons}
                        lfmByCharacterName={lfmByCharacterName}
                        onLfmClick={onLfmClick}
                      />
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  )
}
