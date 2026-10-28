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
  Link,
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
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  WritePasswordRejectedError,
  fetchActivity,
  fetchCompletions,
  updateCompletion,
  updateCompletionsBulk,
  type ActivityMap,
  type CompletionEntry,
  type CompletionMap,
} from '@/api/adventureLog'
import { ADVENTURE_LOG_PASSWORD_STORAGE_KEY } from '@/api/adventureLog/constants'
import { fetchCharactersByIds, fetchQuestsById, type CharacterData, type Quest } from '@/api/ddoAudit'
import HidePacksDialog from '@/components/adventureLog/HidePacksDialog'
import { CHARACTERS } from '@/config/characters'
import {
  bandForCharacter,
  bandLabel,
  buildQuestRows,
  completionKey,
  formatLevelRange,
  getPackName,
  groupLabel,
  groupQuestRows,
  listAdventurePackInfo,
  sagaGroupNamesForRow,
  type QuestGroup,
  type QuestRowModel,
} from '@/domains/adventureLog/grouping'
import {
  QUEST_RANSACK_LIMIT,
  getRansackStatus,
  isWithinRansackWindow,
} from '@/domains/adventureLog/ransack'
import { getQuestWikiUrl } from '@/utils/wikiUrls'

const DAY_MS = 24 * 60 * 60 * 1000
const HIDDEN_PACKS_STORAGE_KEY = 'lowb-adventure-log-hidden-packs'
const PLAYER_STORAGE_KEY = 'lowb-adventure-log-player'
const CHARACTER_STORAGE_KEY = 'lowb-adventure-log-character'

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

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return <>{text}</>

  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <Box component="mark" sx={{ px: 0.25, borderRadius: '2px', bgcolor: 'warning.main', color: 'inherit' }}>
        {text.slice(index, index + needle.length)}
      </Box>
      {text.slice(index + needle.length)}
    </>
  )
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function HistoryTooltip({ history }: { history: readonly string[] }) {
  if (history.length === 0) return <span>No recorded completions</span>

  const status = getRansackStatus(history)

  return (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {status.runsInWindow}/{QUEST_RANSACK_LIMIT} runs in the last 7 days
        {status.ransacked ? ' — ransacked' : `, ${Math.max(QUEST_RANSACK_LIMIT - status.runsInWindow, 0)} to go`}
      </Typography>
      {history.map((iso) => {
        const inWindow = isWithinRansackWindow(iso)
        return (
          <Stack key={iso} direction="row" spacing={1} sx={{ fontSize: 12, lineHeight: 1.6 }}>
            <Box
              component="span"
              sx={{ color: inWindow ? 'warning.main' : 'text.secondary', fontWeight: inWindow ? 700 : 400 }}
            >
              {formatRelative(iso)}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {formatExact(iso)}
            </Box>
          </Stack>
        )
      })}
    </Box>
  )
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage can be blocked; the selection still applies to this page view.
  }
}

function readStoredPassword(): string {
  try {
    return localStorage.getItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storePassword(value: string): void {
  try {
    if (value) localStorage.setItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY, value)
    else localStorage.removeItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY)
  } catch {
    // Non-fatal.
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
    // Non-fatal.
  }
}

const PLAYER_NAMES = [...new Set(Object.values(CHARACTERS).map((character) => character.player))].sort(
  (left, right) => left.localeCompare(right),
)

function charactersOfPlayer(player: string): Array<{ id: string; name: string }> {
  return Object.values(CHARACTERS)
    .filter((character) => character.player === player)
    .map(({ id, name }) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

const ALL_CHARACTER_IDS = Object.keys(CHARACTERS)

interface QuestRowProps {
  row: QuestRowModel
  entry: CompletionEntry | undefined
  busy: boolean
  query: string
  occupants: Array<{ id: string; name: string; level: number | null }>
  onToggle: (row: QuestRowModel, finished: boolean) => void
}

function QuestRow({ row, entry, busy, query, occupants, onToggle }: QuestRowProps) {
  const finished = entry?.finished === true
  const ransack = getRansackStatus(entry?.history ?? [])

  return (
    <TableRow hover>
      <TableCell padding="checkbox">
        <Checkbox
          checked={finished}
          disabled={busy}
          onChange={(event) => onToggle(row, event.target.checked)}
          inputProps={{ 'aria-label': `Mark ${row.quest.name} (${bandLabel(row.band)}) as done` }}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
          <Link
            href={getQuestWikiUrl(row.quest.name)}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="inherit"
          >
            <HighlightedText text={row.quest.name} query={query} />
          </Link>
          {row.quest.type === 'Raid' && <Chip size="small" color="secondary" label="Raid" />}
          {occupants.length > 0 && (
            <Tooltip
              title={`Inside now: ${occupants
                .map((occupant) => `${occupant.name}${occupant.level ? ` (L${occupant.level})` : ''}`)
                .join(', ')}`}
            >
              <Chip size="small" color="info" label={`${occupants.length} inside`} />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
          <span>{row.level ?? '—'}</span>
          <Chip size="small" variant="outlined" label={bandLabel(row.band)} />
        </Stack>
      </TableCell>
      <TableCell>{row.quest.type ?? '—'}</TableCell>
      <TableCell>
        <HighlightedText text={row.quest.patron ?? '—'} query={query} />
      </TableCell>
      <TableCell>
        {finished ? (
          <Tooltip title={<HistoryTooltip history={entry?.history ?? []} />}>
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
  const [characterData, setCharacterData] = useState<Record<string, CharacterData>>({})
  const [activity, setActivity] = useState<ActivityMap>({})
  const [playerName, setPlayerName] = useState(() => readStorage(PLAYER_STORAGE_KEY))
  const [characterId, setCharacterId] = useState(() => readStorage(CHARACTER_STORAGE_KEY))
  const [search, setSearch] = useState('')
  const [onlyRansacked, setOnlyRansacked] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [sagasOnly, setSagasOnly] = useState(false)
  const [patronFilter, setPatronFilter] = useState('')
  const [hiddenPacks, setHiddenPacks] = useState<Set<string>>(readHiddenPacks)
  const [packsDialogOpen, setPacksDialogOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState(readStoredPassword)
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [bulkGroupId, setBulkGroupId] = useState<string | null>(null)

  const groupRefs = useRef(new Map<string, HTMLTableRowElement>())
  const characterSelectionInitialized = useRef(false)
  const lastAutoFocusedCharacter = useRef<string | null>(null)
  const pendingAction = useRef<((secret: string) => void) | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [questMap, log, characters, presence] = await Promise.all([
        fetchQuestsById(),
        fetchCompletions(signal),
        fetchCharactersByIds(ALL_CHARACTER_IDS, { signal }),
        fetchActivity(signal),
      ])

      const unique = new Map<string, Quest>()
      for (const quest of Object.values(questMap)) unique.set(quest.id, quest)
      setQuests([...unique.values()])
      setCompletions(log)
      setCharacterData(characters)
      setActivity(presence)
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

  // Pick the player/character once the character data (online + level) is known:
  // the stored player, their single online character, else the stored character.
  useEffect(() => {
    if (characterSelectionInitialized.current) return
    if (loading || PLAYER_NAMES.length === 0) return
    characterSelectionInitialized.current = true

    const storedPlayer = readStorage(PLAYER_STORAGE_KEY)
    const storedCharacter = readStorage(CHARACTER_STORAGE_KEY)

    const player = PLAYER_NAMES.includes(storedPlayer)
      ? storedPlayer
      : (PLAYER_NAMES.find((name) =>
          charactersOfPlayer(name).some((character) => characterData[character.id]?.is_online),
        ) ?? PLAYER_NAMES[0])

    const options = charactersOfPlayer(player)
    const online = options.filter((character) => characterData[character.id]?.is_online)
    const character =
      online.length === 1
        ? online[0].id
        : options.some((option) => option.id === storedCharacter)
          ? storedCharacter
          : (options[0]?.id ?? '')

    setPlayerName(player)
    setCharacterId(character)
    writeStorage(PLAYER_STORAGE_KEY, player)
    writeStorage(CHARACTER_STORAGE_KEY, character)
  }, [characterData, loading])

  const handlePlayerChange = useCallback(
    (nextPlayer: string) => {
      setPlayerName(nextPlayer)
      writeStorage(PLAYER_STORAGE_KEY, nextPlayer)

      const options = charactersOfPlayer(nextPlayer)
      const online = options.filter((character) => characterData[character.id]?.is_online)
      const storedCharacter = readStorage(CHARACTER_STORAGE_KEY)
      const nextCharacter =
        online.length === 1
          ? online[0].id
          : options.some((option) => option.id === storedCharacter)
            ? storedCharacter
            : (options[0]?.id ?? '')

      setCharacterId(nextCharacter)
      writeStorage(CHARACTER_STORAGE_KEY, nextCharacter)
      setExpandedGroups(new Set())
    },
    [characterData],
  )

  const handleCharacterChange = useCallback((nextCharacter: string) => {
    setCharacterId(nextCharacter)
    writeStorage(CHARACTER_STORAGE_KEY, nextCharacter)
    setExpandedGroups(new Set())
  }, [])

  const withPassword = useCallback(
    (action: (secret: string) => void) => {
      if (password) {
        action(password)
        return
      }
      pendingAction.current = action
      setPasswordDraft('')
      setPasswordPromptOpen(true)
    },
    [password],
  )

  const applyLocalBulk = useCallback(
    (keys: string[], finished: boolean) => {
      setCompletions((previous) => {
        const forCharacter = { ...(previous[characterId] ?? {}) }
        for (const key of keys) {
          const existing = forCharacter[key]
          forCharacter[key] = {
            finished,
            lastFinishedAt: existing?.lastFinishedAt ?? null,
            history: existing?.history ?? [],
            levelAtFinish: existing?.levelAtFinish ?? null,
            source: 'manual',
          }
        }
        return { ...previous, [characterId]: forCharacter }
      })
    },
    [characterId],
  )

  const sendEdit = useCallback(
    async (row: QuestRowModel, finished: boolean, secret: string) => {
      setBusyKey(row.key)
      setError(null)
      try {
        await updateCompletion({
          characterId,
          questId: row.quest.id,
          band: row.band,
          finished,
          password: secret,
        })
        applyLocalBulk([row.key], finished)
      } catch (editError) {
        if (editError instanceof WritePasswordRejectedError) {
          storePassword('')
          setPassword('')
          setError('The write password was rejected. Enter it again.')
          withPassword((nextSecret) => void sendEdit(row, finished, nextSecret))
        } else {
          setError((editError as Error).message)
        }
      } finally {
        setBusyKey(null)
      }
    },
    [characterId, applyLocalBulk, withPassword],
  )

  const handleToggle = useCallback(
    (row: QuestRowModel, finished: boolean) => {
      withPassword((secret) => void sendEdit(row, finished, secret))
    },
    [sendEdit, withPassword],
  )

  const handleBulkToggle = useCallback(
    (group: QuestGroup, finished: boolean) => {
      const changed = group.rows.filter(
        (row) => (completions[characterId]?.[row.key]?.finished === true) !== finished,
      )
      if (changed.length === 0) return

      withPassword((secret) => {
        void (async () => {
          setBulkGroupId(group.id)
          setError(null)
          try {
            await updateCompletionsBulk({
              characterId,
              items: changed.map((row) => ({ questId: row.quest.id, band: row.band, finished })),
              password: secret,
            })
            applyLocalBulk(
              changed.map((row) => row.key),
              finished,
            )
          } catch (bulkError) {
            if (bulkError instanceof WritePasswordRejectedError) {
              storePassword('')
              setPassword('')
              setError('The write password was rejected for this group.')
            } else {
              setError((bulkError as Error).message)
            }
          } finally {
            setBulkGroupId(null)
          }
        })()
      })
    },
    [characterId, completions, applyLocalBulk, withPassword],
  )

  const confirmPassword = useCallback(() => {
    const next = passwordDraft.trim()
    if (!next) return
    storePassword(next)
    setPassword(next)
    setPasswordPromptOpen(false)
    setPasswordDraft('')
    const action = pendingAction.current
    pendingAction.current = null
    action?.(next)
  }, [passwordDraft])

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
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests])

  const rows = useMemo(() => buildQuestRows(quests), [quests])

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle) {
        const haystack = [row.quest.name, getPackName(row.quest) ?? '', row.quest.patron ?? '']
        if (!haystack.some((value) => value.toLowerCase().includes(needle))) return false
      }

      if (sagasOnly && sagaGroupNamesForRow(row.quest, row.band).length === 0) return false
      if (patronFilter && row.quest.patron !== patronFilter) return false

      const entry = characterCompletions[row.key]
      if (hideCompleted && entry?.finished) return false
      if (onlyRansacked && !getRansackStatus(entry?.history ?? []).ransacked) return false
      return true
    })
  }, [rows, search, onlyRansacked, hideCompleted, sagasOnly, patronFilter, characterCompletions])

  const groups = useMemo(
    () => groupQuestRows(visibleRows, hiddenPacks, { allSagas: sagasOnly }),
    [visibleRows, hiddenPacks, sagasOnly],
  )
  const packs = useMemo(() => listAdventurePackInfo(quests), [quests])
  /** Packs whose rows cover more than one version, so the label needs the suffix. */
  const multiBandPacks = useMemo(() => {
    const byPack = new Map<string, Set<string>>()
    for (const row of rows) {
      const pack = getPackName(row.quest)
      if (!pack) continue
      const bands = byPack.get(pack) ?? new Set<string>()
      bands.add(row.band)
      byPack.set(pack, bands)
    }
    return new Set([...byPack.entries()].filter(([, bands]) => bands.size > 1).map(([pack]) => pack))
  }, [rows])

  const patrons = useMemo(() => {
    const names = new Set<string>()
    for (const quest of quests) if (quest.patron) names.add(quest.patron)
    return [...names].sort((left, right) => left.localeCompare(right))
  }, [quests])

  /** `${questId}:${band}` -> characters currently inside that quest version. */
  const occupantsByKey = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; level: number | null }>>()
    for (const [occupantId, presence] of Object.entries(activity)) {
      if (!presence.questId) continue
      const info = CHARACTERS[occupantId]
      const quest = questById.get(presence.questId)
      if (!info || !quest) continue
      const level = characterData[occupantId]?.total_level ?? null
      const key = completionKey(quest.id, bandForCharacter(quest, level))
      map.set(key, [...(map.get(key) ?? []), { id: occupantId, name: info.name, level }])
    }
    return map
  }, [activity, characterData, questById])

  const groupedRowCount = groups.reduce((total, group) => total + group.rows.length, 0)
  const doneCount = groups.reduce(
    (total, group) => total + group.rows.filter((row) => characterCompletions[row.key]?.finished).length,
    0,
  )
  const searching = search.trim().length > 0

  // Focus the table: the group holding the character's current quest, otherwise the
  // group around their level. Runs once per character.
  useEffect(() => {
    if (groups.length === 0) return
    if (lastAutoFocusedCharacter.current === characterId) return
    lastAutoFocusedCharacter.current = characterId

    const characterLevel = characterData[characterId]?.total_level ?? null
    const currentQuestId = activity[characterId]?.questId ?? null

    const target = currentQuestId
      ? groups.find((group) => group.rows.some((row) => row.quest.id === currentQuestId))
      : (groups.find(
          (group) =>
            characterLevel !== null &&
            group.levelMin !== null &&
            group.levelMax !== null &&
            characterLevel >= group.levelMin &&
            characterLevel <= group.levelMax,
        ) ??
        groups.find((group) => characterLevel !== null && group.levelMax !== null && group.levelMax <= characterLevel))

    if (!target) return
    setExpandedGroups((previous) => new Set(previous).add(target.id))
    requestAnimationFrame(() => {
      groupRefs.current.get(target.id)?.scrollIntoView({ block: 'center' })
    })
  }, [activity, characterData, characterId, groups])

  const selectedCharacter = characterId ? CHARACTERS[characterId] : undefined
  const selectedLevel = characterId ? (characterData[characterId]?.total_level ?? null) : null
  const renderRow = (row: QuestRowModel) => (
    <QuestRow
      key={row.key}
      row={row}
      entry={characterCompletions[row.key]}
      busy={busyKey === row.key || bulkGroupId !== null}
      query={search}
      occupants={occupantsByKey.get(row.key) ?? []}
      onToggle={handleToggle}
    />
  )

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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="adventure-log-player">Player</InputLabel>
            <Select
              labelId="adventure-log-player"
              label="Player"
              value={PLAYER_NAMES.includes(playerName) ? playerName : ''}
              onChange={(event) => handlePlayerChange(event.target.value)}
            >
              {PLAYER_NAMES.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="adventure-log-character">Character</InputLabel>
            <Select
              labelId="adventure-log-character"
              label="Character"
              value={characterId}
              onChange={(event) => handleCharacterChange(event.target.value)}
              renderValue={(value) => {
                const character = CHARACTERS[String(value)]
                const level = characterData[String(value)]?.total_level
                return character ? `${character.name}${level ? ` · L${level}` : ''}` : String(value)
              }}
            >
              {charactersOfPlayer(playerName).map((character) => {
                const level = characterData[character.id]?.total_level
                const online = characterData[character.id]?.is_online === true
                return (
                  <MenuItem key={character.id} value={character.id}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: online ? 'success.main' : 'action.disabled',
                        }}
                      />
                      <span>{character.name}</span>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {level ? `L${level}` : ''}
                      </Typography>
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Search quest, pack or favor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
          />

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id="adventure-log-favor">Favor</InputLabel>
            <Select
              labelId="adventure-log-favor"
              label="Favor"
              value={patronFilter}
              onChange={(event) => setPatronFilter(event.target.value)}
            >
              <MenuItem value="">All favor</MenuItem>
              {patrons.map((patron) => (
                <MenuItem key={patron} value={patron}>
                  {patron}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={onlyRansacked} onChange={(event) => setOnlyRansacked(event.target.checked)} />}
            label="Ransacked"
          />

          <FormControlLabel
            control={<Checkbox checked={hideCompleted} onChange={(event) => setHideCompleted(event.target.checked)} />}
            label="Hide completed"
          />

          <ToggleButton
            value="sagas"
            size="small"
            selected={sagasOnly}
            onChange={() => setSagasOnly((previous) => !previous)}
            title="Show only quests that belong to a saga"
          >
            Sagas only
          </ToggleButton>
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
                    <TableCell>Favor</TableCell>
                    <TableCell>Last done</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searching
                    ? visibleRows.map(renderRow)
                    : groups.map((group) => {
                        const expanded = expandedGroups.has(group.id)
                        const done = group.rows.filter((row) => characterCompletions[row.key]?.finished).length
                        const allDone = done === group.rows.length
                        const someDone = done > 0 && !allDone
                        const bulkBusy = bulkGroupId === group.id

                        return (
                          <Fragment key={group.id}>
                            <TableRow
                              hover
                              onClick={() => toggleGroup(group.id)}
                              sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
                              ref={(element: HTMLTableRowElement | null) => {
                                if (element) groupRefs.current.set(group.id, element)
                                else groupRefs.current.delete(group.id)
                              }}
                            >
                              <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                                {bulkBusy ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <Checkbox
                                    checked={allDone}
                                    indeterminate={someDone}
                                    disabled={group.rows.length === 0}
                                    onChange={(event) => handleBulkToggle(group, event.target.checked)}
                                    inputProps={{ 'aria-label': `Mark all ${groupLabel(group)} quests as done` }}
                                  />
                                )}
                              </TableCell>
                              <TableCell colSpan={4}>
                                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
                                  {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {group.kind === 'pack' && group.band && multiBandPacks.has(group.label)
                                      ? groupLabel(group)
                                      : group.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    L{formatLevelRange(group)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" color="text.secondary">
                                  {done}/{group.rows.length}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            {expanded && group.rows.map(renderRow)}
                          </Fragment>
                        )
                      })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary">
          {searching ? `${visibleRows.length} matching quests` : `${groups.length} groups · ${groupedRowCount} rows`} ·{' '}
          {doneCount} marked done
          {selectedCharacter && selectedLevel ? ` · ${selectedCharacter.name} is L${selectedLevel}` : ''}
          {patronFilter ? ` · favor: ${patronFilter}` : ''}
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

      <Dialog open={passwordPromptOpen} onClose={() => setPasswordPromptOpen(false)}>
        <DialogTitle>Write password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Hint: the guild name, four lowercase letters. It is remembered in this browser, so you only enter it once.
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
          <Button onClick={() => setPasswordPromptOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPassword} disabled={!passwordDraft.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
