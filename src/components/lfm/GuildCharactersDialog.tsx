import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useReducer } from 'react'

import { fetchAreasById, fetchGuildCharacters, GuildCharacter } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useConfig } from '@/contexts/useConfig'
import { getPlayerName } from '@/domains/raids/raidLogic'

interface GuildCharactersDialogProps {
  guildName: string | null
  serverName: string
  onClose: () => void
}

interface FetchState {
  characters: GuildCharacter[]
  areas: Record<string, { name: string }>
  loading: boolean
  error: string | null
}

type FetchAction =
  | { type: 'start' }
  | { type: 'success'; characters: GuildCharacter[]; areas: Record<string, { name: string }> }
  | { type: 'error'; error: string }

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'start':
      return { characters: [], areas: state.areas, loading: true, error: null }
    case 'success':
      return { characters: action.characters, areas: action.areas, loading: false, error: null }
    case 'error':
      return { ...state, loading: false, error: action.error }
  }
}

const initialState: FetchState = { characters: [], areas: {}, loading: false, error: null }

export default function GuildCharactersDialog({ guildName, serverName, onClose }: GuildCharactersDialogProps) {
  const { showClassIcons } = useConfig()
  const [state, dispatch] = useReducer(fetchReducer, initialState)
  const { characters, areas, loading, error } = state

  const fetchData = useCallback((guild: string, server: string, signal: AbortSignal) => {
    dispatch({ type: 'start' })
    Promise.all([
      fetchGuildCharacters(server, guild, signal),
      fetchAreasById(),
    ])
      .then(([chars, areasData]) => {
        if (signal.aborted) return
        chars.sort((a, b) => {
          const aKnown = EXPECTED_PLAYERS.includes(getPlayerName(a.name)) ? 0 : 1
          const bKnown = EXPECTED_PLAYERS.includes(getPlayerName(b.name)) ? 0 : 1
          if (aKnown !== bKnown) return aKnown - bKnown
          if (b.total_level !== a.total_level) return b.total_level - a.total_level
          return a.name.localeCompare(b.name)
        })
        dispatch({ type: 'success', characters: chars, areas: areasData })
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
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {characters.map((c) => {
                  const playerName = getPlayerName(c.name)
                  const isKnown = EXPECTED_PLAYERS.includes(playerName)
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" noWrap>{c.name}</Typography>
                          {isKnown && (
                            <Chip size="small" color="success" label={playerName} />
                          )}
                          {c.is_in_party && (
                            <Chip size="small" variant="outlined" label="In Party" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{c.total_level}</TableCell>
                      <TableCell>
                        <ClassDisplay classes={c.classes} showIcons={showClassIcons} />
                      </TableCell>
                      <TableCell>{c.race}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {areas[String(c.location_id)]?.name || 'Unknown'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  )
}
