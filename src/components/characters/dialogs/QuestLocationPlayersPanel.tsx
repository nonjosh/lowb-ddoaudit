import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import { memo, useEffect, useMemo, useState } from 'react'

import { fetchServerCharacters, formatLocalDateTime, getCharacterDisplayName, Quest, ServerCharacter } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { useConfig } from '@/contexts/useConfig'
import {
  buildQuestLocationIds,
  compareQuestLocationPlayers,
  filterPlayersInQuestLocation,
  getDefaultSortDirection,
  PlayerSortKey,
  SortDirection,
} from '@/domains/characters/questLocationPlayers'

interface QuestLocationPlayersPanelProps {
  questInfo: Quest | null
  questInfoLoading: boolean
  active: boolean
}

const DEFAULT_PLAYER_SORT_KEY: PlayerSortKey = 'party'
const DEFAULT_PLAYER_SORT_DIRECTION: SortDirection = 'desc'

function haveSameCharacterClasses(
  current: ServerCharacter['classes'],
  next: ServerCharacter['classes'],
): boolean {
  if (current.length !== next.length) return false

  for (let index = 0; index < current.length; index += 1) {
    const currentClass = current[index]
    const nextClass = next[index]

    if (currentClass.name !== nextClass.name || currentClass.level !== nextClass.level) {
      return false
    }
  }

  return true
}

function sortOnlineCharacters(characters: ServerCharacter[]): ServerCharacter[] {
  return [...characters].sort((a, b) => a.id - b.id)
}

function haveSameOnlineCharacters(current: ServerCharacter[], next: ServerCharacter[]): boolean {
  if (current.length !== next.length) return false

  for (let index = 0; index < current.length; index += 1) {
    const currentCharacter = current[index]
    const nextCharacter = next[index]

    if (
      currentCharacter.id !== nextCharacter.id ||
      currentCharacter.name !== nextCharacter.name ||
      currentCharacter.race !== nextCharacter.race ||
      currentCharacter.total_level !== nextCharacter.total_level ||
      currentCharacter.location_id !== nextCharacter.location_id ||
      currentCharacter.guild_name !== nextCharacter.guild_name ||
      currentCharacter.is_in_party !== nextCharacter.is_in_party ||
      currentCharacter.is_anonymous !== nextCharacter.is_anonymous ||
      !haveSameCharacterClasses(currentCharacter.classes, nextCharacter.classes)
    ) {
      return false
    }
  }

  return true
}

function areQuestLocationPlayersPanelPropsEqual(
  prev: QuestLocationPlayersPanelProps,
  next: QuestLocationPlayersPanelProps,
): boolean {
  return (
    prev.active === next.active
    && prev.questInfoLoading === next.questInfoLoading
    && prev.questInfo?.id === next.questInfo?.id
    && prev.questInfo?.areaId === next.questInfo?.areaId
  )
}

function QuestLocationPlayersPanel({ questInfo, questInfoLoading, active }: QuestLocationPlayersPanelProps) {
  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersError, setPlayersError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [onlineCharacters, setOnlineCharacters] = useState<ServerCharacter[]>([])
  const [reloadToken, setReloadToken] = useState(0)
  const [sortState, setSortState] = useState<{
    locationKey: string
    key: PlayerSortKey
    direction: SortDirection
  }>({
    locationKey: '',
    key: DEFAULT_PLAYER_SORT_KEY,
    direction: DEFAULT_PLAYER_SORT_DIRECTION,
  })
  const { showClassIcons } = useConfig()
  const locationKey = `${questInfo?.id ?? ''}:${questInfo?.areaId ?? ''}`
  const questLocationId = questInfo?.id ?? ''
  const areaLocationId = questInfo?.areaId ?? ''
  const playerSortKey = sortState.locationKey === locationKey ? sortState.key : DEFAULT_PLAYER_SORT_KEY
  const playerSortDirection = sortState.locationKey === locationKey ? sortState.direction : DEFAULT_PLAYER_SORT_DIRECTION
  const hasLoadedPlayers = lastUpdatedAt !== null

  useEffect(() => {
    if (!active || !questInfo) return

    const controller = new AbortController()
    let cancelled = false

    const loadPlayers = async () => {
      setPlayersError(null)
      setPlayersLoading(true)

      try {
        const characters = await fetchServerCharacters('shadowdale', { signal: controller.signal })
        if (cancelled) return
        const nextOnlineCharacters = sortOnlineCharacters(characters.filter((character) => character.is_online))
        setOnlineCharacters((current) => (haveSameOnlineCharacters(current, nextOnlineCharacters) ? current : nextOnlineCharacters))
        setLastUpdatedAt(new Date())
      } catch (error: unknown) {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPlayersError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) {
          setPlayersLoading(false)
        }
      }
    }

    void loadPlayers()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [active, areaLocationId, questInfo, questLocationId, reloadToken])

  const locationIds = useMemo(() => buildQuestLocationIds(questInfo), [questInfo])

  const playersInLocation = useMemo(
    () => filterPlayersInQuestLocation(onlineCharacters, locationIds),
    [locationIds, onlineCharacters],
  )

  const sortedPlayersInLocation = useMemo(
    () => [...playersInLocation].sort((a, b) => compareQuestLocationPlayers(a, b, playerSortKey, playerSortDirection)),
    [playerSortDirection, playerSortKey, playersInLocation],
  )

  const handleSortRequest = (key: PlayerSortKey) => {
    if (playerSortKey === key) {
      setSortState((prev) => ({
        locationKey,
        key,
        direction: prev.locationKey === locationKey && prev.direction === 'asc' ? 'desc' : 'asc',
      }))
      return
    }
    setSortState({
      locationKey,
      key,
      direction: getDefaultSortDirection(key),
    })
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Online players currently in this quest location.
      </Typography>
      {playersError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setPlayersError(null)
                setReloadToken((prev) => prev + 1)
              }}
            >
              Retry
            </Button>
          }
        >
          {playersError}
        </Alert>
      )}
      {hasLoadedPlayers && (
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${playersInLocation.length} in location`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${onlineCharacters.length} online server-wide`}
            />
            {playersLoading && <Chip size="small" color="info" variant="outlined" label="Refreshing..." />}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatLocalDateTime(lastUpdatedAt, { includeSeconds: true })}
          </Typography>
        </Stack>
      )}
      {questInfoLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Loading quest location data...
          </Typography>
        </Box>
      ) : !questInfo ? (
        <Alert severity="info">
          Quest location data is unavailable for this quest.
        </Alert>
      ) : !hasLoadedPlayers ? (
        playersError ? null : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading server player data...
            </Typography>
          </Box>
        )
      ) : sortedPlayersInLocation.length === 0 ? (
        <Alert severity="info">
          No online players are currently in this location.
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={playerSortKey === 'name' ? playerSortDirection : false}>
                  <TableSortLabel
                    active={playerSortKey === 'name'}
                    direction={playerSortKey === 'name' ? playerSortDirection : 'asc'}
                    onClick={() => handleSortRequest('name')}
                  >
                    Character
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={playerSortKey === 'guild' ? playerSortDirection : false}>
                  <TableSortLabel
                    active={playerSortKey === 'guild'}
                    direction={playerSortKey === 'guild' ? playerSortDirection : 'asc'}
                    onClick={() => handleSortRequest('guild')}
                  >
                    Guild
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={playerSortKey === 'level' ? playerSortDirection : false}>
                  <TableSortLabel
                    active={playerSortKey === 'level'}
                    direction={playerSortKey === 'level' ? playerSortDirection : 'desc'}
                    onClick={() => handleSortRequest('level')}
                  >
                    Level
                  </TableSortLabel>
                </TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Race</TableCell>
                <TableCell sortDirection={playerSortKey === 'party' ? playerSortDirection : false}>
                  <TableSortLabel
                    active={playerSortKey === 'party'}
                    direction={playerSortKey === 'party' ? playerSortDirection : 'desc'}
                    onClick={() => handleSortRequest('party')}
                  >
                    Party
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlayersInLocation.map((character) => (
                <TableRow key={character.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {getCharacterDisplayName(character.name, { isAnonymous: character.is_anonymous })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {character.guild_name ? `<${character.guild_name}>` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {character.total_level}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ClassDisplay classes={character.classes} showIcons={showClassIcons} iconSize={16} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {character.race || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={character.is_in_party ? 'In Party' : 'Solo'}
                      color={character.is_in_party ? 'success' : 'default'}
                      variant={character.is_in_party ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}

export default memo(QuestLocationPlayersPanel, areQuestLocationPlayersPanelPropsEqual)
