import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TuneIcon from '@mui/icons-material/Tune'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListSubheader,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import {
  WritePasswordRejectedError,
  fetchCompletions,
  updateCompletion,
  type CompletionEntry,
  type CompletionMap,
} from '@/api/adventureLog'
import { ADVENTURE_LOG_PASSWORD_STORAGE_KEY } from '@/api/adventureLog/constants'
import { fetchQuestsById, type Quest } from '@/api/ddoAudit'
import HidePacksDialog from '@/components/adventureLog/HidePacksDialog'
import { CHARACTERS } from '@/config/characters'
import { groupLabel, groupQuests, listAdventurePacks, type QuestGroup } from '@/domains/adventureLog/grouping'
import { QUEST_RANSACK_LIMIT, getRansackStatus } from '@/domains/adventureLog/ransack'

const RECENT_DAYS = 8
const DAY_MS = 24 * 60 * 60 * 1000
const HIDDEN_PACKS_STORAGE_KEY = 'lowb-adventure-log-hidden-packs'

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

function formatHistory(history: readonly string[]): string {
  if (history.length === 0) return 'No recorded completions'
  return history
    .slice(0, 10)
    .map((iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }))
    .join('\n')
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

function readHiddenPacks(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_PACKS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

function storeHiddenPacks(packs: Set<string>): void {
  try {
    localStorage.setItem(HIDDEN_PACKS_STORAGE_KEY, JSON.stringify([...packs]))
  } catch {
    // Non-fatal: the selection applies for this view only.
  }
}

const playerGroups = (() => {
  const byPlayer = new Map<string, { id: string; name: string }[]>()
  for (const character of Object.values(CHARACTERS)) {
    const list = byPlayer.get(character.player) ?? []
    list.push({ id: character.id, name: character.name })
    byPlayer.set(character.player, list)
  }

  return [...byPlayer.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([player, characters]) => ({
      player,
      characters: characters.sort((left, right) => left.name.localeCompare(right.name)),
    }))
})()

interface QuestRowProps {
  quest: Quest
  entry: CompletionEntry | undefined
  busy: boolean
  onToggle: (questId: string, finished: boolean) => void
}

function QuestRow({ quest, entry, busy, onToggle }: QuestRowProps) {
  const finished = entry?.finished === true
  const ransack = getRansackStatus(entry?.history ?? [])

  return (
    <TableRow hover>
      <TableCell padding="checkbox">
        <Checkbox
          checked={finished}
          disabled={busy}
          onChange={(event) => onToggle(quest.id, event.target.checked)}
          inputProps={{ 'aria-label': `Mark ${quest.name} as done` }}
        />
      </TableCell>
      <TableCell>{quest.name}</TableCell>
      <TableCell align="right">{quest.level ?? '—'}</TableCell>
      <TableCell>{quest.type ?? '—'}</TableCell>
      <TableCell>
        {finished ? (
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{formatHistory(entry?.history ?? [])}</span>}>
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
              <span>{formatRelative(entry?.lastFinishedAt ?? null)}</span>
              {ransack.ransacked ? (
                <Chip size="small" color="warning" label="Ransacked" />
              ) : ransack.runsInWindow > 1 ? (
                <Typography variant="caption" color="text.secondary">
                  {ransack.runsInWindow}/{QUEST_RANSACK_LIMIT} in 7d
                </Typography>
              ) : null}
            </Stack>
          </Tooltip>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  )
}

export default function AdventureLog() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [completions, setCompletions] = useState<CompletionMap>({})
  const [characterId, setCharacterId] = useState(() => playerGroups[0]?.characters[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [hiddenPacks, setHiddenPacks] = useState<Set<string>>(readHiddenPacks)
  const [packsDialogOpen, setPacksDialogOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
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
        await updateCompletion({ characterId, questId, finished, password: secret })

        setCompletions((previous) => {
          const forCharacter = { ...(previous[characterId] ?? {}) }
          const existing = forCharacter[questId]
          forCharacter[questId] = {
            finished,
            lastFinishedAt: existing?.lastFinishedAt ?? null,
            history: existing?.history ?? [],
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

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const toggleHiddenPack = useCallback((pack: string) => {
    setHiddenPacks((previous) => {
      const next = new Set(previous)
      if (next.has(pack)) next.delete(pack)
      else next.add(pack)
      storeHiddenPacks(next)
      return next
    })
  }, [])

  const showAllPacks = useCallback(() => {
    const empty = new Set<string>()
    storeHiddenPacks(empty)
    setHiddenPacks(empty)
  }, [])

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

  const groups = useMemo(() => groupQuests(visibleQuests, hiddenPacks), [visibleQuests, hiddenPacks])
  const packs = useMemo(() => listAdventurePacks(quests), [quests])

  const groupedQuestCount = groups.reduce((total, group) => total + group.quests.length, 0)
  const doneCount = groups.reduce(
    (total, group) => total + group.quests.filter((quest) => characterCompletions[quest.id]?.finished).length,
    0,
  )

  const searching = search.trim().length > 0

  const renderRows = (items: Quest[]) =>
    items.map((quest) => (
      <QuestRow
        key={quest.id}
        quest={quest}
        entry={characterCompletions[quest.id]}
        busy={busyQuestId === quest.id}
        onToggle={handleToggle}
      />
    ))

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
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<TuneIcon />}
              onClick={() => setPacksDialogOpen(true)}
              title="Choose which adventure packs to hide"
            >
              Packs{hiddenPacks.size > 0 ? ` (${hiddenPacks.size} hidden)` : ''}
            </Button>
            <Button variant="outlined" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="adventure-log-character">Character</InputLabel>
            <Select
              labelId="adventure-log-character"
              label="Character"
              value={characterId}
              onChange={(event) => setCharacterId(event.target.value)}
              renderValue={(value) => CHARACTERS[String(value)]?.name ?? String(value)}
            >
              {playerGroups.flatMap((group) => [
                <ListSubheader key={`player:${group.player}`}>{group.player}</ListSubheader>,
                ...group.characters.map((character) => (
                  <MenuItem key={character.id} value={character.id}>
                    {character.name}
                  </MenuItem>
                )),
              ])}
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
                  {searching
                    ? renderRows(visibleQuests)
                    : groups.map((group: QuestGroup) => {
                        const expanded = expandedGroups.has(group.id)
                        const groupDone = group.quests.filter((quest) => characterCompletions[quest.id]?.finished).length
                        return (
                          <Fragment key={group.id}>
                            <TableRow hover onClick={() => toggleGroup(group.id)} sx={{ cursor: 'pointer' }}>
                              <TableCell padding="checkbox">
                                {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                              </TableCell>
                              <TableCell colSpan={3}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {groupLabel(group)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" color="text.secondary">
                                  {groupDone}/{group.quests.length}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            {expanded && renderRows(group.quests)}
                          </Fragment>
                        )
                      })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary">
          {searching
            ? `${visibleQuests.length} matching quests`
            : `${groups.length} groups · ${groupedQuestCount} quests`}{' '}
          · {doneCount} marked done
          {hiddenPacks.size > 0 ? ` · ${hiddenPacks.size} packs hidden` : ''}
        </Typography>
      </Stack>

      <HidePacksDialog
        open={packsDialogOpen}
        packs={packs}
        hiddenPacks={hiddenPacks}
        onToggle={toggleHiddenPack}
        onShowAll={showAllPacks}
        onClose={() => setPacksDialogOpen(false)}
      />

      <Dialog open={pendingEdit !== null} onClose={() => setPendingEdit(null)}>
        <DialogTitle>Write password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ask in Discord for the shared write password. It is stored in this browser tab only.
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
