import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  WritePasswordRejectedError,
  fetchCompletions,
  updateCompletion,
  type CompletionMap,
} from '@/api/adventureLog'
import { ADVENTURE_LOG_PASSWORD_STORAGE_KEY } from '@/api/adventureLog/constants'
import { fetchQuestsById, type Quest } from '@/api/ddoAudit'
import { CHARACTERS } from '@/config/characters'

const RECENT_DAYS = 8
const DAY_MS = 24 * 60 * 60 * 1000

function formatRelative(iso: string | null): string {
  if (!iso) return 'before tracking'
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return 'unknown'

  const elapsed = Date.now() - timestamp
  if (elapsed < 60_000) return 'just now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return `${Math.floor(elapsed / DAY_MS)}d ago`
}

function isRecent(iso: string | null): boolean {
  if (!iso) return false
  const timestamp = new Date(iso).getTime()
  return Number.isFinite(timestamp) && Date.now() - timestamp <= RECENT_DAYS * DAY_MS
}

function readStoredPassword(): string {
  try {
    return sessionStorage.getItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storePassword(value: string): void {
  try {
    if (value) sessionStorage.setItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY, value)
    else sessionStorage.removeItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY)
  } catch {
    // Storage can be blocked (private mode, policy). The password still works for this page view.
  }
}

const characters = Object.values(CHARACTERS).sort(
  (left, right) => left.player.localeCompare(right.player) || left.name.localeCompare(right.name),
)

export default function AdventureLog() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [completions, setCompletions] = useState<CompletionMap>({})
  const [characterId, setCharacterId] = useState(() => characters[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState(readStoredPassword)
  const [pendingEdit, setPendingEdit] = useState<{ questId: string; finished: boolean } | null>(null)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [questMap, log] = await Promise.all([fetchQuestsById(), fetchCompletions(signal)])
      const unique = new Map<string, Quest>()
      for (const quest of Object.values(questMap)) unique.set(quest.id, quest)
      const sorted = [...unique.values()].sort(
        (left, right) => (left.level ?? 0) - (right.level ?? 0) || left.name.localeCompare(right.name),
      )
      setQuests(sorted)
      setCompletions(log)
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') {
        setError((loadError as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const sendEdit = useCallback(
    async (questId: string, finished: boolean, secret: string) => {
      setBusyQuestId(questId)
      setError(null)
      try {
        await updateCompletion({
          characterId,
          questId,
          finished,
          // Never send a timestamp: omitting it lets the server keep whatever the
          // poller observed (null for a first manual record). Sending null from a
          // stale tab would erase a completion the poller recorded after page load.
          password: secret,
        })

        setCompletions((previous) => {
          const forCharacter = { ...(previous[characterId] ?? {}) }
          const existing = forCharacter[questId]
          forCharacter[questId] = {
            finished,
            lastFinishedAt: existing?.lastFinishedAt ?? null,
            levelAtFinish: existing?.levelAtFinish ?? null,
            source: 'manual',
          }
          return { ...previous, [characterId]: forCharacter }
        })
      } catch (editError) {
        if (editError instanceof WritePasswordRejectedError) {
          storePassword('')
          setPassword('')
          setPendingEdit({ questId, finished })
          setPasswordDraft('')
          setError('The write password was rejected. Enter it again.')
        } else {
          setError((editError as Error).message)
        }
      } finally {
        setBusyQuestId(null)
      }
    },
    [characterId],
  )

  const handleToggle = useCallback(
    (questId: string, finished: boolean) => {
      if (!password) {
        setPendingEdit({ questId, finished })
        setPasswordDraft('')
        return
      }
      void sendEdit(questId, finished, password)
    },
    [password, sendEdit],
  )

  const confirmPassword = useCallback(() => {
    const next = passwordDraft.trim()
    if (!next || !pendingEdit) return
    storePassword(next)
    setPassword(next)
    const edit = pendingEdit
    setPendingEdit(null)
    setPasswordDraft('')
    void sendEdit(edit.questId, edit.finished, next)
  }, [passwordDraft, pendingEdit, sendEdit])

  const characterCompletions = useMemo(() => completions[characterId] ?? {}, [completions, characterId])

  const visibleQuests = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return quests.filter((quest) => {
      if (needle && !quest.name.toLowerCase().includes(needle)) return false
      if (!onlyMissing) return true
      const entry = characterCompletions[quest.id]
      return !(entry?.finished && isRecent(entry.lastFinishedAt))
    })
  }, [quests, search, onlyMissing, characterCompletions])

  const doneCount = visibleQuests.filter((quest) => characterCompletions[quest.id]?.finished).length

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="h1">
              Adventure Log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quest completions inferred from character activity, editable by hand. Checkbox state is shared by everyone
              with the write password.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="adventure-log-character">Character</InputLabel>
            <Select
              labelId="adventure-log-character"
              label="Character"
              value={characterId}
              onChange={(event) => setCharacterId(event.target.value)}
            >
              {characters.map((character) => (
                <MenuItem key={character.id} value={character.id}>
                  {character.name} ({character.player})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search quests"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 240, flex: 1 }}
          />

          <FormControlLabel
            control={<Checkbox checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)} />}
            label={`Not done in ${RECENT_DAYS} days`}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined">
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Quest</TableCell>
                    <TableCell align="right">Level</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Last done</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleQuests.map((quest) => {
                    const entry = characterCompletions[quest.id]
                    const finished = entry?.finished === true
                    const busy = busyQuestId === quest.id
                    return (
                      <TableRow key={quest.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={finished}
                            disabled={busy}
                            onChange={(event) => handleToggle(quest.id, event.target.checked)}
                            inputProps={{ 'aria-label': `Mark ${quest.name} as done` }}
                          />
                        </TableCell>
                        <TableCell>{quest.name}</TableCell>
                        <TableCell align="right">{quest.level ?? '—'}</TableCell>
                        <TableCell>{quest.type ?? '—'}</TableCell>
                        <TableCell>
                          {finished ? formatRelative(entry?.lastFinishedAt ?? null) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary">
          {visibleQuests.length} quests shown · {doneCount} marked done
        </Typography>
      </Stack>

      <Dialog open={pendingEdit !== null} onClose={() => setPendingEdit(null)}>
        <DialogTitle>Write password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ask in Discord for the shared write password. It is stored in this browser only.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Password"
            value={passwordDraft}
            onChange={(event) => setPasswordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') confirmPassword()
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPassword} disabled={!passwordDraft.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
