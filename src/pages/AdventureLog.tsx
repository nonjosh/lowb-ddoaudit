import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import TuneIcon from '@mui/icons-material/Tune'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
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
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Popover,
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
import { alpha } from '@mui/material/styles'
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import {
  WritePasswordRejectedError,
  fetchActivity,
  fetchCompletions,
  fetchReincarnations,
  resetReincarnation,
  updateCompletion,
  updateCompletionsBulk,
  type ActivityMap,
  type CompletionEntry,
  type CompletionMap,
  type ReincarnationMap,
} from '@/api/adventureLog'
import { ADVENTURE_LOG_PASSWORD_STORAGE_KEY } from '@/api/adventureLog/constants'
import { fetchCharactersByIds, fetchQuestsById, formatLocalDate, formatLocalDateTime, type CharacterData, type Quest } from '@/api/ddoAudit'
import HidePacksDialog from '@/components/adventureLog/HidePacksDialog'
import ClassDisplay from '@/components/shared/ClassDisplay'
import ReincarnationDialog from '@/components/adventureLog/ReincarnationDialog'
import { CHARACTERS } from '@/config/characters'
import type { CharacterClass } from '@/domains/raids/raidLogic'
import sagaCardsData from '@/data/sagaCards.json'
import {
  bandForCharacter,
  bandLabel,
  buildQuestRows,
  completionKey,
  formatLevelRange,
  getPackName,
  getSagaNames,
  groupLabel,
  groupQuestRows,
  isWildernessQuest,
  listAdventurePackInfo,
  sagaGroupNamesForRow,
  type QuestBand,
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
/** Hide quests further than this from the selected character's level. */
const OFF_LEVEL_RANGE = 6
const HIDDEN_PACKS_STORAGE_KEY = 'lowb-adventure-log-hidden-packs'
/** Version colours, shared by the row badge and the group header tint. */
const BAND_COLOR: Record<QuestBand, 'success' | 'info' | 'warning'> = {
  heroic: 'success',
  epic: 'info',
  legendary: 'warning',
}

function normalizeSagaName(name: string): string {
  return name
    .replace(/\s*\((heroic|epic|legendary)\)\s*$/i, '')
    .replace(/^the\s+/i, '')
    .trim()
    .toLowerCase()
}

/** Deck of Many Curses card per saga base name (wiki Item:Deck_of_Many_Curses). */
const SAGA_CARDS = new Map<string, string[]>(
  Object.entries((sagaCardsData as { cards: Record<string, string[]> }).cards).map(([name, cards]) => [
    normalizeSagaName(name),
    cards,
  ]),
)

function getSagaCards(sagaLabel: string): string[] {
  return SAGA_CARDS.get(normalizeSagaName(sagaLabel)) ?? []
}

/** Deck of Many Curses card tints, one colour per card type. */
const CARD_COLORS: Record<string, string> = {
  forbidden: '#ce93d8',
  uncanny: '#81c784',
  otherworldly: '#ffd54f',
  accursed: '#e57373',
}

function cardColor(card: string): string | undefined {
  return CARD_COLORS[card.split(' ')[0].toLowerCase()]
}

const PLAYER_STORAGE_KEY = 'lowb-adventure-log-player'
const CHARACTER_STORAGE_KEY = 'lowb-adventure-log-character'

function formatRelative(iso: string | null): string {
  if (!iso) return 'no data'
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

function HistoryTooltip({
  history,
  trAt,
  now,
}: {
  history: readonly string[]
  trAt: string | null
  now: number
}) {
  if (history.length === 0) return <span>No data</span>

  const status = getRansackStatus(history, now, trAt)
  const lifeStart = trAt ? new Date(trAt).getTime() : null

  return (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {status.runsInWindow}/{QUEST_RANSACK_LIMIT} loots in this ransack timer
        {status.ransacked
          ? ' — ransacked'
          : status.runsInWindow === QUEST_RANSACK_LIMIT
            ? ' — next loot is ransacked'
            : `, ${QUEST_RANSACK_LIMIT - status.runsInWindow} to go`}
      </Typography>
      {status.resetsAt && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
          {status.truncated ? 'Resets by ~' : 'Resets ~'}
          {formatLocalDateTime(status.resetsAt)}
        </Typography>
      )}
      {history.map((iso) => {
        const timestamp = new Date(iso).getTime()
        const previousLife = lifeStart !== null && timestamp < lifeStart
        const inWindow = status.windowStart ? timestamp >= status.windowStart.getTime() : isWithinRansackWindow(iso)
        return (
          <Stack key={iso} direction="row" spacing={1} sx={{ fontSize: 12, lineHeight: 1.6 }}>
            <Box
              component="span"
              sx={{
                color: previousLife ? 'text.disabled' : inWindow ? 'warning.main' : 'text.secondary',
                fontWeight: inWindow && !previousLife ? 700 : 400,
              }}
            >
              {formatRelative(iso)}
              {previousLife ? ' (prev life)' : ''}
            </Box>
            <Box component="span" sx={{ color: previousLife ? 'text.disabled' : 'text.secondary' }}>
              {formatLocalDateTime(iso)}
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

/** "Ken,Renz" — deduplicated players, capped so the chip stays readable. */
function formatOccupantPlayers(occupants: Array<{ player: string }>): string {
  const players = [...new Set(occupants.map((occupant) => occupant.player))]
  if (players.length <= 3) return players.join(',')
  return `${players.slice(0, 3).join(',')} +${players.length - 3}`
}

interface QuestRowProps {
  row: QuestRowModel
  entry: CompletionEntry | undefined
  busy: boolean
  query: string
  showSagaBadge: boolean
  trAt: string | null
  now: number
  occupants: Array<{
    id: string
    name: string
    player: string
    level: number | null
    classes: CharacterClass[]
  }>
  onToggle: (row: QuestRowModel, finished: boolean) => void
}

function QuestRow({ row, entry, busy, query, showSagaBadge, trAt, now, occupants, onToggle }: QuestRowProps) {
  const finished = entry?.finished === true
  const ransack = getRansackStatus(entry?.history ?? [], now, trAt)
  const sagaNames = showSagaBadge ? getSagaNames(row.quest) : []

  return (
    <TableRow hover>
      <TableCell padding="checkbox" sx={{ pl: 5 }}>
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
          {row.quest.type && row.quest.type !== 'Party' && (
            <Chip
              size="small"
              color={row.quest.type === 'Raid' ? 'secondary' : 'default'}
              label={row.quest.type}
            />
          )}
          {sagaNames.length > 0 && (
            <Tooltip title={`Saga: ${sagaNames.join(', ')}`}>
              <Chip size="small" variant="outlined" color="info" label="Saga" />
            </Tooltip>
          )}
          {occupants.length > 0 && (
            <Tooltip
              title={
                <Stack spacing={0.5}>
                  {occupants.map((occupant) => (
                    <Stack key={occupant.id} direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {occupant.player}
                      </Typography>
                      <Typography variant="caption">{occupant.name}</Typography>
                      {occupant.level ? (
                        <Typography variant="caption" color="text.secondary">
                          L{occupant.level}
                        </Typography>
                      ) : null}
                      <ClassDisplay classes={occupant.classes} showIcons iconSize={14} />
                    </Stack>
                  ))}
                </Stack>
              }
            >
              <Chip
                size="small"
                variant="outlined"
                color="success"
                label={
                  <Stack component="span" direction="row" spacing={0.75} alignItems="center">
                    {/* pulsing live dot: a solid core plus an expanding ring */}
                    <Box component="span" sx={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                      <Box
                        component="span"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          bgcolor: 'currentColor',
                          '@keyframes insidePing': {
                            '0%': { transform: 'scale(1)', opacity: 0.7 },
                            '100%': { transform: 'scale(2.6)', opacity: 0 },
                          },
                          animation: 'insidePing 1.8s ease-out infinite',
                          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 },
                        }}
                      />
                      <Box
                        component="span"
                        sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'currentColor' }}
                      />
                    </Box>
                    <span>{formatOccupantPlayers(occupants)} inside</span>
                  </Stack>
                }
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
          <span>{row.level ?? '—'}</span>
          <Chip size="small" variant="outlined" color={BAND_COLOR[row.band]} label={bandLabel(row.band)} />
        </Stack>
      </TableCell>
      <TableCell>
        <HighlightedText text={row.quest.patron ?? '—'} query={query} />
      </TableCell>
      <TableCell>
        {(entry?.history.length ?? 0) > 0 ? (
          <Tooltip title={<HistoryTooltip history={entry?.history ?? []} trAt={trAt} now={now} />}>
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
              <span>{finished ? formatRelative(entry?.lastFinishedAt ?? null) : '—'}</span>
              {ransack.ransacked ? (
                <Chip size="small" color="warning" label="Ransacked" />
              ) : ransack.runsInWindow > 1 ? (
                <Typography variant="caption" color="text.secondary">
                  {ransack.runsInWindow}/{QUEST_RANSACK_LIMIT}
                  {ransack.runsInWindow === QUEST_RANSACK_LIMIT ? ' · next loot ransacked' : ''}
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
  const [reincarnations, setReincarnations] = useState<ReincarnationMap>({})
  const [playerName, setPlayerName] = useState(() => readStorage(PLAYER_STORAGE_KEY))
  const [characterId, setCharacterId] = useState(() => readStorage(CHARACTER_STORAGE_KEY))
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search)
  const [onlyRansacked, setOnlyRansacked] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [sagasOnly, setSagasOnly] = useState(false)
  const [hideOffLevel, setHideOffLevel] = useState(true)
  const [patronFilters, setPatronFilters] = useState<Set<string>>(new Set())
  const [favorAnchor, setFavorAnchor] = useState<HTMLElement | null>(null)
  const [hiddenPacks, setHiddenPacks] = useState<Set<string>>(readHiddenPacks)
  const [packsDialogOpen, setPacksDialogOpen] = useState(false)
  const [trDialogOpen, setTrDialogOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [password, setPassword] = useState(readStoredPassword)
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [bulkGroupId, setBulkGroupId] = useState<string | null>(null)

  const characterSelectionInitialized = useRef(false)
  const pendingAction = useRef<((secret: string) => void) | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [questMap, log, characters, presence, lives] = await Promise.all([
        fetchQuestsById(),
        fetchCompletions(signal),
        fetchCharactersByIds(ALL_CHARACTER_IDS, { signal }),
        fetchActivity(signal),
        // Decoration only: a 404 before the API deploy must not blank the page.
        fetchReincarnations(signal).catch(() => ({})),
      ])

      const unique = new Map<string, Quest>()
      for (const quest of Object.values(questMap)) unique.set(quest.id, quest)
      setQuests([...unique.values()])
      setCompletions(log)
      setCharacterData(characters)
      setActivity(presence)
      setReincarnations(lives)
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

  // Relative times and ransack windows need a clock; keep it out of render.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

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
          // Re-enter through the prompt, not through withPassword(): its closure
          // still holds the rejected secret and would retry in a loop.
          pendingAction.current = (nextSecret) => void sendEdit(row, finished, nextSecret)
          setPasswordDraft('')
          setPasswordPromptOpen(true)
        } else {
          setError((editError as Error).message)
        }
      } finally {
        setBusyKey(null)
      }
    },
    [characterId, applyLocalBulk],
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

  const runReincarnation = useCallback(
    async (atIso: string, secret: string) => {
      setError(null)
      try {
        await resetReincarnation(characterId, atIso, secret)
        await load()
      } catch (reincarnationError) {
        if (reincarnationError instanceof WritePasswordRejectedError) {
          storePassword('')
          setPassword('')
          setError('The write password was rejected. Enter it again.')
          pendingAction.current = (nextSecret) => void runReincarnation(atIso, nextSecret)
          setPasswordDraft('')
          setPasswordPromptOpen(true)
        } else {
          setError((reincarnationError as Error).message)
        }
      }
    },
    [characterId, load],
  )

  const handleReincarnation = useCallback(
    (atIso: string) => {
      setTrDialogOpen(false)
      withPassword((secret) => void runReincarnation(atIso, secret))
    },
    [runReincarnation, withPassword],
  )

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

  /** `${questId}:${band}` -> characters currently inside that quest version. */
  const occupantsByKey = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; name: string; player: string; level: number | null; classes: CharacterClass[] }>
    >()
    for (const [occupantId, presence] of Object.entries(activity)) {
      if (!presence.questId) continue
      const info = CHARACTERS[occupantId]
      const quest = questById.get(presence.questId)
      if (!info || !quest) continue
      const level = characterData[occupantId]?.total_level ?? null
      const key = completionKey(quest.id, bandForCharacter(quest, level))
      map.set(key, [
        ...(map.get(key) ?? []),
        {
          id: occupantId,
          name: info.name,
          player: info.player,
          level,
          classes: characterData[occupantId]?.classes ?? [],
        },
      ])
    }
    return map
  }, [activity, characterData, questById])


  const isFinished = useCallback(
    (row: QuestRowModel) => characterCompletions[row.key]?.finished === true,
    [characterCompletions],
  )

  /** Everything the user asked for, before the level cut (used for group totals). */
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Adventure areas (Sorrowdusk Isle, Korthos Island, ...) are not quests.
      if (isWildernessQuest(row.quest)) return false

      if (sagasOnly && sagaGroupNamesForRow(row.quest, row.band).length === 0) return false
      if (patronFilters.size > 0 && !patronFilters.has(row.quest.patron ?? '')) return false
      if (onlyRansacked && !getRansackStatus(characterCompletions[row.key]?.history ?? []).ransacked) return false
      return true
    })
  }, [rows, onlyRansacked, sagasOnly, patronFilters, characterCompletions])

  const searching = query.trim().length > 0

  /**
   * Search selects whole groups: a group is kept when any of its rows matches the
   * quest name, its adventure pack or its favor faction. All other rows of that group
   * stay visible so the pack can be read in context.
   */
  /** Groups before the level cut: totals, "all done" checks and completeness. */
  const allGroups = useMemo(
    () => groupQuestRows(filteredRows, hiddenPacks, { mode: sagasOnly ? 'sagas' : 'packs' }),
    [filteredRows, hiddenPacks, sagasOnly],
  )

  /** Level cut: skipped while searching, so a lookup is never silently filtered. */
  const visibleRows = useMemo(() => {
    if (!hideOffLevel || searching) return filteredRows

    const characterLevel = characterId ? (characterData[characterId]?.total_level ?? null) : null
    if (characterLevel === null) return filteredRows

    return filteredRows.filter((row) => {
      if (row.level === null) return true
      if (Math.abs(row.level - characterLevel) <= OFF_LEVEL_RANGE) return true
      // Keep it visible when someone is inside, or this character cleared it.
      if (occupantsByKey.has(row.key)) return true
      return characterCompletions[row.key]?.finished === true
    })
  }, [filteredRows, hideOffLevel, searching, characterId, characterData, occupantsByKey, characterCompletions])

  /** Row totals per group and whether every row is done, from before the level cut. */
  const groupInfo = useMemo(() => {
    const map = new Map<string, { total: number; allDone: boolean }>()
    for (const group of allGroups) {
      map.set(group.id, { total: group.rows.length, allDone: group.rows.every((row) => isFinished(row)) })
    }
    return map
  }, [allGroups, isFinished])

  /**
   * A group is hidden by "Hide completed" only when every quest in it is done;
   * partially-done groups keep their full list.
   */
  const groups = useMemo(() => {
    const visible = groupQuestRows(visibleRows, hiddenPacks, { mode: sagasOnly ? 'sagas' : 'packs' })
    if (!hideCompleted) return visible
    return visible.filter((group) => !groupInfo.get(group.id)?.allDone)
  }, [visibleRows, hiddenPacks, sagasOnly, hideCompleted, groupInfo])

  /**
   * Search selects whole groups: a group is kept when any of its rows matches the
   * quest name, its adventure pack or its favor faction.
   */
  const matchingGroupIds = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return null

    const ids = new Set<string>()
    for (const group of groups) {
      const hit = group.rows.some((row) =>
        [row.quest.name, getPackName(row.quest) ?? '', row.quest.patron ?? ''].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
      if (hit) ids.add(group.id)
    }
    return ids
  }, [query, groups])
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

  const renderedGroups = useMemo(
    () => (matchingGroupIds ? groups.filter((group) => matchingGroupIds.has(group.id)) : groups),
    [groups, matchingGroupIds],
  )

  const groupedRowCount = renderedGroups.reduce((total, group) => total + group.rows.length, 0)
  const doneCount = renderedGroups.reduce(
    (total, group) => total + group.rows.filter((row) => characterCompletions[row.key]?.finished).length,
    0,
  )

  // Groups start collapsed; only groups someone is currently inside open themselves.
  useEffect(() => {
    const occupied = groups.filter((group) => group.rows.some((row) => occupantsByKey.has(row.key)))
    if (occupied.length === 0) return

    setExpandedGroups((previous) => {
      const next = new Set(previous)
      for (const group of occupied) next.add(group.id)
      return next
    })
  }, [groups, occupantsByKey])

  const trAt = characterId ? (reincarnations[characterId]?.at ?? null) : null
  const characterEntries = useMemo(() => Object.values(characterCompletions), [characterCompletions])
  const selectedCharacter = characterId ? CHARACTERS[characterId] : undefined
  const selectedLevel = characterId ? (characterData[characterId]?.total_level ?? null) : null
  const renderRow = (row: QuestRowModel) => (
    <QuestRow
      key={row.key}
      row={row}
      entry={characterCompletions[row.key]}
      busy={busyKey === row.key || bulkGroupId !== null}
      query={query}
      showSagaBadge={!sagasOnly}
      trAt={trAt}
      now={now}
      occupants={occupantsByKey.get(row.key) ?? []}
      onToggle={handleToggle}
    />
  )

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h4" component="h1">
                Adventure Log
              </Typography>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={() => void load()} disabled={loading} size="small" aria-label="Refresh">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Quest completions inferred from character activity, editable by hand. Checkbox state is shared by everyone
              with the write password.
            </Typography>
          </Box>
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
              {PLAYER_NAMES.map((name) => {
                const online = charactersOfPlayer(name).some(
                  (character) => characterData[character.id]?.is_online === true,
                )
                return (
                  <MenuItem key={name} value={name}>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: online ? 'success.main' : 'action.disabled',
                        }}
                      />
                      <span>{name}</span>
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="adventure-log-character">Character</InputLabel>
            <Select
              labelId="adventure-log-character"
              label="Character"
              value={characterId}
              onChange={(event) => handleCharacterChange(event.target.value)}
              renderValue={(value) => {
                const character = CHARACTERS[String(value)]
                const data = characterData[String(value)]
                if (!character) return String(value)

                return (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{character.name}</span>
                    {data?.total_level ? (
                      <Typography variant="caption" color="text.secondary">
                        L{data.total_level}
                      </Typography>
                    ) : null}
                    {(data?.classes?.length ?? 0) > 0 && (
                      <Box component="span" aria-hidden sx={{ display: 'inline-flex' }}>
                        <ClassDisplay classes={data?.classes ?? []} showIcons iconSize={16} />
                      </Box>
                    )}
                  </Stack>
                )
              }}
            >
              {charactersOfPlayer(playerName).map((character) => {
                const level = characterData[character.id]?.total_level
                const online = characterData[character.id]?.is_online === true
                return (
                  <MenuItem key={character.id} value={character.id}>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: online ? 'success.main' : 'action.disabled',
                        }}
                      />
                      <span>{character.name}</span>
                      <Typography variant="caption" color="text.secondary">
                        {level ? `L${level}` : ''}
                      </Typography>
                      <Box sx={{ ml: 'auto' }}>
                        <ClassDisplay classes={characterData[character.id]?.classes ?? []} showIcons iconSize={16} />
                      </Box>
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {trAt && (
            <Tooltip
              title={`Reincarnated ${formatLocalDateTime(trAt)} (${reincarnations[characterId]?.source ?? 'manual'})`}
            >
              <Chip size="small" variant="outlined" color="secondary" label={`TR ${formatLocalDate(trAt)}`} />
            </Tooltip>
          )}

          <Tooltip title="Record a reincarnation and reset this character's checkboxes">
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<WarningAmberIcon />}
              onClick={() => setTrDialogOpen(true)}
            >
              TR reset
            </Button>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          <ToggleButton
            value="offlevel"
            size="small"
            selected={hideOffLevel}
            onChange={() => setHideOffLevel((previous) => !previous)}
            title={`Hide quests more than ${OFF_LEVEL_RANGE} levels away from the character`}
          >
            ±{OFF_LEVEL_RANGE} levels
          </ToggleButton>

          <Button
            variant="outlined"
            size="small"
            startIcon={<TuneIcon />}
            onClick={() => setPacksDialogOpen(true)}
            title="Choose which adventure packs to hide"
          >
            Packs{hiddenPacks.size > 0 ? ` (${hiddenPacks.size} hidden)` : ''}
          </Button>
        </Stack>

        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Search quest, pack or favor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
          />

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
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 56 }} />
                    <TableCell>Quest</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>
                      Level
                    </TableCell>
                    <TableCell sx={{ width: 220 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>Favor</span>
                        <IconButton
                          size="small"
                          aria-label="Filter by favor"
                          aria-haspopup="dialog"
                          aria-expanded={favorAnchor !== null}
                          color={patronFilters.size > 0 ? 'primary' : 'default'}
                          onClick={(event) => setFavorAnchor(event.currentTarget)}
                        >
                          <FilterListIcon fontSize="inherit" />
                        </IconButton>
                        {patronFilters.size > 0 && (
                          <Typography variant="caption" color="primary">
                            {patronFilters.size}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ width: 200 }}>Last done</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renderedGroups.map((group) => {
                        const expanded =
                          expandedGroups.has(group.id) ||
                          (searching && (matchingGroupIds?.has(group.id) ?? false))
                        const done = group.rows.filter((row) => characterCompletions[row.key]?.finished).length
                        const total = groupInfo.get(group.id)?.total ?? group.rows.length
                        const allDone = total > 0 && done === total
                        const someDone = done > 0 && !allDone
                        const bulkBusy = bulkGroupId === group.id

                        return (
                          <Fragment key={group.id}>
                            <TableRow
                              hover
                              onClick={() => toggleGroup(group.id)}
                              sx={{
                                cursor: 'pointer',
                                bgcolor: (() => {
                                  const rowBands = new Set(group.rows.map((row) => row.band))
                                  const band = group.band ?? (rowBands.size === 1 ? [...rowBands][0] : null)
                                  return band
                                    ? (theme) => alpha(theme.palette[BAND_COLOR[band]].main, 0.1)
                                    : 'action.hover'
                                })(),
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
                              <TableCell colSpan={3}>
                                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
                                  {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      textDecoration: allDone ? 'line-through' : 'none',
                                      color: allDone ? 'text.secondary' : 'text.primary',
                                    }}
                                  >
                                    <HighlightedText
                                      text={
                                        group.kind === 'pack' && group.band && multiBandPacks.has(group.label)
                                          ? groupLabel(group)
                                          : group.label
                                      }
                                      query={searching ? query : ''}
                                    />
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    L{formatLevelRange(group)}
                                  </Typography>
                                  {group.kind === 'saga' &&
                                    getSagaCards(group.label).map((card) => (
                                      <Tooltip key={card} title={`Saga reward: ${card} (Deck of Many Curses)`}>
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          color="secondary"
                                          label={card}
                                          sx={{ color: cardColor(card), borderColor: cardColor(card) }}
                                        />
                                      </Tooltip>
                                    ))}
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="caption" color="text.secondary">
                                  {done}/{total}
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
            {renderedGroups.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {searching ? `No quest, pack or favor matches “${search.trim()}”.` : 'No quests match the filters.'}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary">
          {searching
            ? `${renderedGroups.length} matching groups · ${groupedRowCount} rows`
            : `${renderedGroups.length} groups · ${groupedRowCount} rows`}{' '}
          ·{' '}
          {doneCount} marked done
          {selectedCharacter && selectedLevel ? ` · ${selectedCharacter.name} is L${selectedLevel}` : ''}
          {trAt ? ` · TR ${formatLocalDate(trAt)}` : ''}
          {patronFilters.size > 0 ? ` · ${patronFilters.size} favor filter(s)` : ''}
          {hiddenPacks.size > 0 ? ` · ${hiddenPacks.size} packs hidden` : ''}
        </Typography>
      </Stack>

      <ReincarnationDialog
        key={`${trDialogOpen}-${trAt ?? 'none'}`}
        open={trDialogOpen}
        characterName={selectedCharacter?.name ?? 'this character'}
        currentAt={trAt}
        entries={characterEntries}
        onClose={() => setTrDialogOpen(false)}
        onConfirm={handleReincarnation}
      />

      <Popover
        open={favorAnchor !== null}
        anchorEl={favorAnchor}
        onClose={() => setFavorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={0} sx={{ p: 1, minWidth: 220, maxHeight: 340 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, pb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Filter by favor
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" onClick={() => setPatronFilters(new Set())} disabled={patronFilters.size === 0}>
              Clear
            </Button>
          </Stack>
          <Box sx={{ overflowY: 'auto', px: 1 }}>
            {[...patrons, ''].map((patron) => (
              <FormControlLabel
                key={patron || '(none)'}
                sx={{ display: 'flex', mx: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={patronFilters.has(patron)}
                    onChange={() =>
                      setPatronFilters((previous) => {
                        const next = new Set(previous)
                        if (next.has(patron)) next.delete(patron)
                        else next.add(patron)
                        return next
                      })
                    }
                  />
                }
                label={patron || 'No patron'}
              />
            ))}
          </Box>
        </Stack>
      </Popover>

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
