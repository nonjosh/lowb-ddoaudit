import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import LockIcon from '@mui/icons-material/Lock'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ServerCharacter,
  fetchServerCharacterByName,
  fetchServerCharacters,
} from '@/api/ddoAudit'
import { ANONYMOUS_CHARACTER_NAME, formatLocalDateTime } from '@/api/ddoAudit/helpers'
import { CharacterRemark, RemarkClass, RemarkSmurf, RemarkVerdict, isUsingDevStore, remarkKey } from '@/api/remarks'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { CHARACTERS } from '@/config/characters'
import { useConfig } from '@/contexts/useConfig'
import { useRemarks } from '@/contexts/useRemarks'

import { VERDICT_COLOR, VERDICT_ICON } from './verdicts'

const SERVER = 'shadowdale'
const MAX_NOTE_LENGTH = 2000
const MAX_RESULTS = 60

const FRIEND_BY_CHARACTER = new Map(
  Object.values(CHARACTERS).map((character) => [character.name.toLowerCase(), character.player]),
)

/** The fields the dialog needs; both ServerCharacter and the bulk CharacterData fit. */
interface CharacterLike {
  id?: number | string
  name: string
  total_level?: number | null
  classes?: RemarkClass[]
  is_online?: boolean | null
  guild_name?: string | null
  last_update?: string | null
  group_id?: number | string | null
  is_anonymous?: boolean | null
}

interface LookupRow {
  id: string | null
  name: string
  /** The API hides the name of anonymous characters; they get no note. */
  isAnonymous: boolean
  guild: string
  level: number | null
  classes: RemarkClass[]
  isOnline: boolean
  /** Last time DDO Audit saw this character; null for rows built from a note only. */
  lastSeen: string | null
  /** Player display name when this character belongs to the group. */
  friendPlayer: string | null
  groupId: string | null
}

function rowFromCharacter(character: CharacterLike): LookupRow {
  return {
    id: character.id === undefined || character.id === null ? null : String(character.id),
    name: character.name,
    isAnonymous: character.is_anonymous === true,
    guild: character.guild_name ?? '',
    level: typeof character.total_level === 'number' ? character.total_level : null,
    classes: Array.isArray(character.classes) ? character.classes : [],
    isOnline: character.is_online === true,
    lastSeen: character.last_update ?? null,
    friendPlayer: FRIEND_BY_CHARACTER.get(character.name.toLowerCase()) ?? null,
    groupId: character.group_id ? String(character.group_id) : null,
  }
}

function rowFromNote(note: CharacterRemark, name = note.characterName, id: string | null = note.characterId): LookupRow {
  return {
    id,
    name,
    isAnonymous: false,
    guild: '',
    level: note.level,
    classes: note.classes,
    isOnline: false,
    lastSeen: null,
    friendPlayer: FRIEND_BY_CHARACTER.get(name.toLowerCase()) ?? null,
    groupId: null,
  }
}

function VerdictIcon({ verdict, size = 16 }: { verdict: RemarkVerdict; size?: number }) {
  const Icon = VERDICT_ICON[verdict]
  return <Icon color={VERDICT_COLOR[verdict]} sx={{ fontSize: size }} />
}

interface CharacterRowProps {
  row: LookupRow
  note: CharacterRemark | undefined
  selected: boolean
  /** Party lists drop the guild line to stay compact. */
  showGuild?: boolean
  onClick: () => void
}

function CharacterRow({ row, note, selected, showGuild = true, onClick }: CharacterRowProps) {
  const { showClassIcons } = useConfig()

  return (
    <ListItemButton
      selected={selected}
      disabled={row.isAnonymous}
      onClick={onClick}
      sx={{ px: 1, py: 0.5, borderRadius: 1 }}
    >
      <ListItemText
        primary={
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
            <FiberManualRecordIcon
              color={row.isOnline ? 'success' : 'disabled'}
              sx={{ width: 10, height: 10 }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                ...(row.isAnonymous ? { fontStyle: 'italic', fontWeight: 400, color: 'text.secondary' } : {}),
              }}
            >
              {row.isAnonymous ? ANONYMOUS_CHARACTER_NAME : row.name}
            </Typography>
            {row.classes.length ? (
              <ClassDisplay classes={row.classes} showIcons={showClassIcons} iconSize={18} />
            ) : null}
            {row.level !== null ? (
              <Typography variant="caption" color="text.secondary">
                Lv {row.level}
              </Typography>
            ) : null}
            {note ? <VerdictIcon verdict={note.verdict} /> : null}
            {note && note.smurfs.length > 1 ? (
              <Tooltip
                title={`Same player as ${note.smurfs
                  .filter((smurf) => smurf.id !== row.id && remarkKey(smurf.name) !== remarkKey(row.name))
                  .map((smurf) => smurf.name)
                  .join(', ')}`}
              >
                <PeopleAltIcon color="action" sx={{ fontSize: 14 }} />
              </Tooltip>
            ) : null}
            {row.friendPlayer ? <Chip size="small" color="success" label={row.friendPlayer} /> : null}
          </Stack>
        }
        secondary={
          showGuild && row.guild ? (
            <Typography variant="caption" color="text.secondary">
              {row.guild}
            </Typography>
          ) : null
        }
      />
    </ListItemButton>
  )
}

interface NoteEditorProps {
  row: LookupRow
  /** lower-cased name -> character data, shared with the dialog. */
  lookups: Record<string, LookupRow | null>
  resolveCharacter: (name: string) => void
  /** Called after the note was deleted, so the pane can go back to the empty state. */
  onDeleted: () => void
}

function NoteEditor({ row, lookups, resolveCharacter, onDeleted }: NoteEditorProps) {
  const { showClassIcons } = useConfig()
  const { getNote, save, remove, charactersById } = useRemarks()
  const note = getNote(row.name, row.id)

  const ownerId = note?.characterId ?? row.id
  const ownerName = note?.characterName ?? row.name
  const isOwner = ownerId !== null && row.id !== null ? ownerId === row.id : remarkKey(ownerName) === remarkKey(row.name)
  /** Freshest API data for this character; falls back to the row built from the note. */
  const display = (row.id && charactersById[row.id] ? rowFromCharacter(charactersById[row.id]) : null)
    ?? lookups[remarkKey(row.name)]
    ?? row

  const [verdict, setVerdict] = useState<RemarkVerdict | null>(note?.verdict ?? null)
  const [text, setText] = useState(note?.note ?? '')
  const [smurfs, setSmurfs] = useState<RemarkSmurf[]>(note?.smurfs ?? [{ id: row.id, name: row.name }])
  const [smurfInput, setSmurfInput] = useState('')
  const [savedAt, setSavedAt] = useState(note?.updatedAt ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmMove, setConfirmMove] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Decorate the chips with class icons, level and last online; unknown names are kept.
  useEffect(() => {
    for (const smurf of smurfs) {
      if (smurf.id) continue
      if (remarkKey(smurf.name) in lookups) continue
      resolveCharacter(smurf.name)
    }
  }, [smurfs, lookups, resolveCharacter])

  /** Fresh data for a chip: bulk-hydrated by id, or the exact-name lookup when id-less. */
  const rowOfSmurf = (smurf: RemarkSmurf): LookupRow | null | undefined => {
    if (smurf.id) {
      const character = charactersById[smurf.id]
      return character ? rowFromCharacter(character) : lookups[remarkKey(smurf.name)]
    }
    return lookups[remarkKey(smurf.name)]
  }

  // Characters in this draft that own a different note today: saving takes them over and
  // deletes that note, so it needs a second, deliberate press.
  const pendingSmurfName = smurfInput.trim()
  const draftSmurfs: RemarkSmurf[] = [
    ...smurfs,
    ...(pendingSmurfName &&
    remarkKey(pendingSmurfName) !== remarkKey(row.name) &&
    remarkKey(pendingSmurfName) !== remarkKey(ownerName) &&
    !smurfs.some((smurf) => remarkKey(smurf.name) === remarkKey(pendingSmurfName))
      ? [{ id: null, name: pendingSmurfName }]
      : []),
  ]
  const movedNotes = [
    ...new Set(
      draftSmurfs
        // Match by id when known, so a renamed character still shows the warning.
        .map((smurf) => getNote(smurf.name, smurf.id))
        .filter((entry): entry is CharacterRemark => entry !== undefined && entry.characterId !== ownerId)
        .map((entry) => entry.characterName),
    ),
  ]

  const addSmurf = useCallback(() => {
    if (busy) return
    const name = smurfInput.trim()
    if (!name) return
    if (remarkKey(name) === remarkKey(row.name) || remarkKey(name) === remarkKey(ownerName)) {
      setError('That is this character.')
      return
    }
    if (smurfs.some((smurf) => remarkKey(smurf.name) === remarkKey(name))) {
      setError('Already in the list.')
      return
    }
    // Added immediately: the lookup only fills in the id and decorates the chip, so a
    // character the API does not know still links to this note.
    setSmurfs((current) => [...current, { id: null, name }])
    setSmurfInput('')
    setError('')
  }, [busy, smurfInput, smurfs, ownerName, row.name])

  const saveNote = async () => {
    // A name typed but not added is still meant for this save.
    const pending = smurfInput.trim()
    const draftSmurfs: RemarkSmurf[] =
      pending &&
      remarkKey(pending) !== remarkKey(row.name) &&
      remarkKey(pending) !== remarkKey(ownerName) &&
      !smurfs.some((smurf) => remarkKey(smurf.name) === remarkKey(pending))
        ? [...smurfs, { id: null, name: pending }]
        : smurfs

    // Fill in ids and real spellings for anything the API resolved meanwhile.
    const nextSmurfs = draftSmurfs.map((smurf) => {
      if (smurf.id) return smurf
      const resolved = lookups[remarkKey(smurf.name)]
      return resolved ? { id: resolved.id, name: resolved.name } : smurf
    })

    const hasContent = verdict !== null || text.trim() !== ''

    if (!hasContent) {
      setError(
        note
          ? 'Pick an icon or write a note, or use Delete note to remove it.'
          : nextSmurfs.length > 1
            ? 'Add a verdict or a note before saving smurfs.'
            : 'Pick an icon or write a note first.',
      )
      return
    }

    if (!ownerId) {
      setError('This character has no DDO Audit id yet. Find them with the exact-name search first.')
      return
    }

    if (movedNotes.length && !confirmMove) {
      setConfirmMove(true)
      setError('')
      return
    }

    setBusy(true)
    setError('')
    setJustSaved(false)
    try {
      const saved = await save({
        characterId: ownerId,
        characterName: isOwner ? display.name : ownerName,
        verdict: verdict ?? 'info',
        note: text.trim(),
        // The snapshot belongs to the character the note is stored on.
        level: isOwner ? display.level : note?.level ?? display.level,
        classes: isOwner
          ? (display.classes.length ? display.classes : note?.classes ?? [])
          : (note?.classes?.length ? note.classes : display.classes),
        smurfs: nextSmurfs,
      })
      setVerdict(saved.verdict)
      setText(saved.note)
      setSmurfs(saved.smurfs)
      setSmurfInput('')
      setSavedAt(saved.updatedAt)
      setConfirmDelete(false)
      setConfirmMove(false)
      setJustSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  /** Two clicks: the note is shared, so deleting it needs a deliberate second press. */
  const deleteNote = async () => {
    if (!note) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      setError('')
      return
    }

    setBusy(true)
    setError('')
    try {
      await remove(note.characterId)
      onDeleted()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const smurfChips: ReactNode = smurfs.map((smurf) => {
    const resolved = rowOfSmurf(smurf)
    const isThisCharacter = smurf.id
      ? smurf.id === ownerId
      : remarkKey(smurf.name) === remarkKey(ownerName)
    return (
      <Tooltip
        key={`${smurf.id ?? smurf.name}`}
        title={
          resolved === null
            ? `No character named "${smurf.name}" on Shadowdale — the link is kept anyway`
            : isThisCharacter
              ? 'This note is stored on this character'
              : 'Same real player as this character'
        }
      >
        <Chip
          size="small"
          onDelete={
            isThisCharacter
              ? undefined
              : () =>
                  setSmurfs((current) =>
                    current.filter((entry) =>
                      smurf.id ? entry.id !== smurf.id : remarkKey(entry.name) !== remarkKey(smurf.name),
                    ),
                  )
          }
          label={
            <Stack component="span" direction="row" spacing={0.5} alignItems="center">
              <Box component="span">{resolved?.name ?? smurf.name}</Box>
              {resolved?.classes.length ? (
                <ClassDisplay classes={resolved.classes} showIcons={showClassIcons} iconSize={16} hideLevels />
              ) : null}
              {typeof resolved?.level === 'number' ? <Box component="span">Lv {resolved.level}</Box> : null}
              {resolved === null ? <Box component="span">?</Box> : null}
            </Stack>
          }
        />
      </Tooltip>
    )
  })

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {display.name}
        </Typography>
        {display.classes.length ? (
          <ClassDisplay classes={display.classes} showIcons={showClassIcons} iconSize={20} />
        ) : null}
        {display.level !== null ? (
          <Typography variant="body2" color="text.secondary">
            Lv {display.level}
          </Typography>
        ) : null}
        {display.guild ? (
          <Typography variant="body2" color="text.secondary">
            &lt;{display.guild}&gt;
          </Typography>
        ) : null}
        {display.isOnline ? (
          <Chip size="small" color="success" label="Online" />
        ) : display.lastSeen ? (
          <Typography variant="body2" color="text.secondary">
            Last online {formatLocalDateTime(display.lastSeen)}
          </Typography>
        ) : null}
      </Stack>

      {!isOwner ? (
        <Alert severity="info">
          This note is shared with {ownerName}. Saving writes to {ownerName}, so the whole player keeps one note.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Verdict
        </Typography>
        {(['good', 'info', 'avoid'] as RemarkVerdict[]).map((value) => (
          <IconButton
            key={value}
            aria-label={value}
            aria-pressed={verdict === value}
            onClick={() => setVerdict((current) => (current === value ? null : value))}
            sx={{
              border: 2,
              borderColor: verdict === value ? `${VERDICT_COLOR[value]}.main` : 'transparent',
              opacity: verdict === value ? 1 : 0.4,
            }}
          >
            <VerdictIcon verdict={value} size={26} />
          </IconButton>
        ))}
      </Stack>

      <TextField
        label="Note"
        value={text}
        onChange={(event) => setText(event.target.value)}
        multiline
        minRows={4}
        fullWidth
        slotProps={{ htmlInput: { maxLength: MAX_NOTE_LENGTH } }}
        helperText={`${text.length}/${MAX_NOTE_LENGTH}`}
      />

      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Other characters of the same player (they share this note)
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          {smurfChips}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            size="small"
            label="Character name"
            value={smurfInput}
            onChange={(event) => setSmurfInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addSmurf()
              }
            }}
            helperText="Type a name, then Add or Enter."
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addSmurf}
            disabled={busy || !smurfInput.trim()}
            sx={{ mt: 0.25, flexShrink: 0 }}
          >
            Add
          </Button>
        </Stack>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {justSaved ? <Alert severity="success">Saved.</Alert> : null}
      {confirmDelete ? (
        <Alert severity="warning">Deleting removes this note for everyone. Press Confirm delete again.</Alert>
      ) : null}
      {confirmMove && movedNotes.length ? (
        <Alert severity="warning">
          Saving moves {movedNotes.join(', ')} here and deletes that note. Press Save again to confirm.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Button variant="contained" onClick={() => void saveNote()} disabled={busy}>
          {confirmMove && movedNotes.length ? 'Save (moves note)' : 'Save'}
        </Button>
        {note ? (
          <Button
            color="error"
            variant={confirmDelete ? 'contained' : 'outlined'}
            startIcon={<DeleteIcon />}
            onClick={() => void deleteNote()}
            disabled={busy}
          >
            {confirmDelete ? 'Confirm delete' : 'Delete note'}
          </Button>
        ) : null}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {savedAt ? `Last edited ${formatLocalDateTime(savedAt)}` : 'Not saved yet'}
          {smurfs.length > 1 ? ` · ${smurfs.length} characters` : ''}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default function FindCharacterDialog() {
  const { dialog, closeFindCharacter, password, setPassword, notes, loaded, loading, error, getNote, charactersById, reload } =
    useRemarks()

  const [query, setQuery] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [roster, setRoster] = useState<ServerCharacter[] | null>(null)
  const [rosterError, setRosterError] = useState('')
  const [rosterLoading, setRosterLoading] = useState(false)
  const [selected, setSelected] = useState<LookupRow | null>(null)
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupError, setLookupError] = useState('')
  /** lower-cased name -> character data from the exact-name lookup; null = unknown name. */
  const [lookups, setLookups] = useState<Record<string, LookupRow | null>>({})
  const pendingLookups = useRef<Set<string>>(new Set())

  const resolveCharacter = useCallback((name: string) => {
    const key = remarkKey(name)
    if (!key || pendingLookups.current.has(key)) return
    pendingLookups.current.add(key)
    void fetchServerCharacterByName(SERVER, name)
      .then((character) => {
        setLookups((previous) => ({ ...previous, [key]: character ? rowFromCharacter(character) : null }))
      })
      .catch(() => {
        pendingLookups.current.delete(key)
      })
  }, [])

  const latest = useRef({ roster, notes })
  latest.current = { roster, notes }

  // Load the online roster once per unlock.
  useEffect(() => {
    if (!dialog.open || !password || roster) return
    let cancelled = false
    setRosterLoading(true)
    setRosterError('')
    void fetchServerCharacters(SERVER)
      .then((characters) => {
        if (!cancelled) setRoster(characters)
      })
      .catch((cause) => {
        if (!cancelled) setRosterError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dialog.open, password, roster])

  // Opening from a row: show that character's note straight away.
  useEffect(() => {
    if (!dialog.open) return
    setQuery('')
    setLookupError('')
    setSelected(null)
    const name = dialog.character
    if (!name) return

    let cancelled = false
    const { roster: currentRoster, notes: currentNotes } = latest.current
    const fromRoster = currentRoster?.find((character) => remarkKey(character.name) === remarkKey(name))
    if (fromRoster) {
      setSelected(rowFromCharacter(fromRoster))
      return
    }
    const note = currentNotes.find((entry) =>
      entry.smurfs.some(
        (smurf) =>
          (dialog.characterId && smurf.id === dialog.characterId) ||
          remarkKey(smurf.name) === remarkKey(name),
      ),
    )
    if (note) {
      const smurf = note.smurfs.find(
        (entry) =>
          (dialog.characterId && entry.id === dialog.characterId) ||
          remarkKey(entry.name) === remarkKey(name),
      )
      setSelected(smurf ? rowFromNote(note, smurf.name, smurf.id) : rowFromNote(note))
      return
    }

    setLookupBusy(true)
    void fetchServerCharacterByName(SERVER, name)
      .then((character) => {
        if (cancelled) return
        if (character) setSelected(rowFromCharacter(character))
        else setLookupError(`No character named "${name}" on Shadowdale.`)
      })
      .catch((cause) => {
        if (!cancelled) setLookupError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setLookupBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [dialog.open, dialog.character, dialog.characterId])

  const onlineRows = useMemo(
    () => (roster ?? []).filter((character) => character.is_online).map(rowFromCharacter),
    [roster],
  )

  // Fill in level, classes and last-online for marked characters that are not in the roster.
  useEffect(() => {
    if (!dialog.open || !password) return
    for (const note of notes) {
      const key = remarkKey(note.characterName)
      if (key in lookups) continue
      if (onlineRows.some((row) => remarkKey(row.name) === key)) continue
      resolveCharacter(note.characterName)
    }
  }, [dialog.open, password, notes, onlineRows, lookups, resolveCharacter])

  const partyGroups = useMemo(() => {
    const groups = new Map<string, LookupRow[]>()
    for (const row of onlineRows) {
      if (!row.groupId) continue
      const group = groups.get(row.groupId) ?? []
      group.push(row)
      groups.set(row.groupId, group)
    }
    return [...groups.values()]
      .filter((group) => group.some((row) => row.friendPlayer))
      // The group's own characters first, so the friend you know leads the party.
      .map((group) =>
        [...group].sort(
          (left, right) =>
            Number(Boolean(right.friendPlayer)) - Number(Boolean(left.friendPlayer)) ||
            Number(left.isAnonymous) - Number(right.isAnonymous),
        ),
      )
      .sort((left, right) => {
        const leftName = left.find((row) => row.friendPlayer)?.friendPlayer ?? ''
        const rightName = right.find((row) => row.friendPlayer)?.friendPlayer ?? ''
        return leftName.localeCompare(rightName)
      })
  }, [onlineRows])

  const markedRows = useMemo(
    () =>
      notes.map((note) => {
        const key = remarkKey(note.characterName)
        // Prefer fresh API data (level, classes, last online, real spelling) over the snapshot.
        const found =
          (charactersById[note.characterId] ? rowFromCharacter(charactersById[note.characterId]) : null) ??
          lookups[key] ??
          onlineRows.find((row) => row.id === note.characterId || remarkKey(row.name) === key) ??
          null
        return found ?? rowFromNote(note)
      }),
    [notes, onlineRows, lookups, charactersById],
  )

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return []
    const seen = new Set<string>()
    const out: LookupRow[] = []
    const push = (row: LookupRow) => {
      const key = remarkKey(row.name)
      if (seen.has(key)) return
      seen.add(key)
      out.push(row)
    }

    for (const note of notes) {
      const matched = note.smurfs.find((smurf) => remarkKey(smurf.name).includes(q))
      if (matched) {
        const found =
          (matched.id && charactersById[matched.id] ? rowFromCharacter(charactersById[matched.id]) : null) ??
          lookups[remarkKey(matched.name)] ??
          onlineRows.find((row) =>
            matched.id ? row.id === matched.id : remarkKey(row.name) === remarkKey(matched.name),
          ) ??
          null
        push(found ?? rowFromNote(note, matched.name, matched.id))
      } else if (remarkKey(note.characterName).includes(q)) {
        push(rowFromNote(note))
      }
    }
    for (const row of onlineRows) {
      if (row.name.toLowerCase().includes(q) || row.guild.toLowerCase().includes(q)) push(row)
    }
    // Stable sort: anonymous rows drop to the bottom without disturbing the rest.
    return out.sort((left, right) => Number(left.isAnonymous) - Number(right.isAnonymous)).slice(0, MAX_RESULTS)
  }, [q, notes, onlineRows, lookups, charactersById])

  const lookUpExact = async () => {
    const name = query.trim()
    if (!name) return
    setLookupBusy(true)
    setLookupError('')
    try {
      const character = await fetchServerCharacterByName(SERVER, name)
      if (character) setSelected(rowFromCharacter(character))
      else setLookupError(`No character named "${name}" on Shadowdale.`)
    } catch (cause) {
      setLookupError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLookupBusy(false)
    }
  }

  const openRow = (row: LookupRow) => setSelected(row)

  const renderList = (rows: LookupRow[], empty: string, showGuild = true) =>
    rows.length ? (
      <List dense disablePadding>
        {rows.map((row) => (
          <CharacterRow
            key={`${row.name}:${row.groupId ?? ''}`}
            row={row}
            note={getNote(row.name, row.id)}
            selected={selected !== null && remarkKey(selected.name) === remarkKey(row.name)}
            showGuild={showGuild}
            onClick={() => openRow(row)}
          />
        ))}
      </List>
    ) : (
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
        {empty}
      </Typography>
    )

  return (
    <Dialog open={dialog.open} onClose={closeFindCharacter} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
        Find character
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title={password ? 'Change the notes password' : 'Notes are locked'}>
            <IconButton
              size="small"
              aria-label="Change the notes password"
              onClick={() => {
                setPassword('')
                setPasswordInput('')
              }}
            >
              <LockIcon fontSize="small" color={password ? 'action' : 'disabled'} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" aria-label="Close" onClick={closeFindCharacter}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {!password ? (
        <DialogContent dividers>
          <Stack spacing={2} sx={{ py: 1, maxWidth: 420 }}>
            <Alert severity="info">
              Notes are shared with everyone who has the password — the same one as the adventure log.
            </Alert>
            <TextField
              type="password"
              label="Notes password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setPassword(passwordInput)
              }}
              autoFocus
            />
            <Button variant="contained" onClick={() => setPassword(passwordInput)} disabled={!passwordInput}>
              Unlock
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
      ) : (
        <DialogContent
          dividers
          sx={{
            p: 0,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            height: { xs: '78vh', sm: '70vh' },
            overflow: 'hidden',
          }}
        >
          {!loaded ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              {loading ? (
                <CircularProgress />
              ) : (
                // Without a successful load the editor would look like "no notes exist" and
                // a save would overwrite a shared note. Refuse to edit until it loads.
                <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420 }}>
                  <Alert severity="error">{error || 'Could not load the notes.'}</Alert>
                  <Button variant="contained" onClick={() => void reload()}>
                    Try again
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            <>
          {/* Parties with friends: its own column, so it never hides behind the notes. */}
          <Box
            sx={{
              width: { xs: '100%', sm: 250 },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              maxHeight: { xs: '30vh', sm: 'none' },
              borderBottom: { xs: 1, sm: 0 },
              borderRight: { sm: 1 },
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 1.5, pb: 1 }}>
              <Typography variant="subtitle2">Parties with friends</Typography>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
              {rosterLoading ? <CircularProgress size={20} /> : null}
              {rosterError ? <Alert severity="error">{rosterError}</Alert> : null}
              {!rosterLoading && !partyGroups.length ? (
                <Typography variant="body2" color="text.secondary">
                  None of the group is online right now.
                </Typography>
              ) : null}
              <Stack spacing={1.5}>
                {partyGroups.map((group) => (
                  <Box key={group[0].groupId ?? group[0].name}>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      Party with{' '}
                      {[...new Set(group.map((row) => row.friendPlayer).filter(Boolean))].join(', ')}
                    </Typography>
                    {renderList(group, '', false)}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Sidebar: search and the notes you pick from. */}
          <Box
            sx={{
              width: { xs: '100%', sm: 320 },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              maxHeight: { xs: '34vh', sm: 'none' },
              borderBottom: { xs: 1, sm: 0 },
              borderRight: { sm: 1 },
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {isUsingDevStore() ? (
                <Alert severity="warning" sx={{ py: 0 }}>
                  Notes API not deployed: notes are stored in this browser only (dev build).
                </Alert>
              ) : null}
              {error ? <Alert severity="error" sx={{ py: 0 }}>{error}</Alert> : null}
              <TextField
                size="small"
                placeholder="Character or guild name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Tooltip title="Exact character name on Shadowdale. Finds offline characters too.">
                <Box component="span" sx={{ display: 'block' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    startIcon={<PersonSearchIcon fontSize="small" />}
                    onClick={() => void lookUpExact()}
                    disabled={!q || lookupBusy}
                  >
                    {q ? `Search “${query.trim()}”` : 'Search exact name'}
                  </Button>
                </Box>
              </Tooltip>
              {lookupBusy ? <CircularProgress size={20} /> : null}
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
              {lookupError ? <Alert severity="error" sx={{ mb: 1 }}>{lookupError}</Alert> : null}

              {q ? (
                <Stack spacing={1}>
                  {loading ? <CircularProgress size={20} /> : null}
                  {renderList(results, 'No match among online players or saved notes. Use the exact-name search above.')}
                </Stack>
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Marked characters ({markedRows.length})
                  </Typography>
                  {loading ? <CircularProgress size={20} /> : renderList(markedRows, 'No notes yet.')}
                </Box>
              )}
            </Box>
          </Box>

          {/* Detail pane: the note of the character picked on the left. */}
          <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 2 }}>
            {selected ? (
              <NoteEditor
                key={selected.name}
                row={selected}
                lookups={lookups}
                resolveCharacter={resolveCharacter}
                onDeleted={() => setSelected(null)}
              />
            ) : (
              <Stack
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ height: '100%', minHeight: 200, color: 'text.secondary' }}
              >
                <PersonSearchIcon sx={{ fontSize: 40 }} />
                <Typography variant="body2" textAlign="center">
                  Pick a character on the left to read or write their note.
                </Typography>
                <Typography variant="caption" textAlign="center">
                  Notes are shared with everyone who has the password.
                </Typography>
              </Stack>
            )}
          </Box>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
