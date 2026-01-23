import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { useMemo, useState } from 'react'

import { Quest } from '@/api/ddoAudit'
import { Character, useCharacter } from '@/contexts/useCharacter'
import { useRansack } from '@/contexts/useRansack'

const DEFAULT_DAYS = 7
const DEFAULT_HOURS = 0
const DEFAULT_MINUTES = 0

function formatDuration(days: number, hours: number, minutes: number): string {
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(' ') : '0 minutes'
}

interface AddRansackTimerDialogProps {
  open: boolean
  onClose: () => void
  playerName: string
  characters: Character[]
  defaultCharacterId?: string
  defaultQuestId?: string
}

interface FormContentProps {
  onClose: () => void
  playerName: string
  characters: Character[]
  defaultCharacterId?: string
  defaultQuestId?: string
}

function FormContent({
  onClose,
  playerName,
  characters,
  defaultCharacterId,
  defaultQuestId,
}: FormContentProps) {
  const { questsById } = useCharacter()
  const { addTimer } = useRansack()

  // Deduplicate quests by using a Map keyed by quest id (primaryId)
  const questOptions = useMemo(() => {
    const seen = new Map<string, Quest>()
    for (const quest of Object.values(questsById ?? {})) {
      if (quest.type === 'Raid' || (quest.level && quest.level >= 20)) {
        // Use the quest's own id as the deduplication key
        if (!seen.has(quest.id)) {
          seen.set(quest.id, quest)
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [questsById])

  const defaultCharacter = useMemo(() => {
    if (defaultCharacterId) {
      return characters.find((c) => c.id === defaultCharacterId)
    }
    const onlineChar = characters.find((c) => c.is_online)
    return onlineChar ?? characters[0]
  }, [characters, defaultCharacterId])

  const defaultQuest = useMemo(() => {
    if (defaultQuestId && questsById?.[defaultQuestId]) {
      return questsById[defaultQuestId]
    }
    return null
  }, [questsById, defaultQuestId])

  // Initialize state with defaults - this component remounts each time dialog opens
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(defaultCharacter?.id ?? '')
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(defaultQuest)
  const [days, setDays] = useState<number>(DEFAULT_DAYS)
  const [hours, setHours] = useState<number>(DEFAULT_HOURS)
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES)

  const selectedCharacter = useMemo(() => {
    return characters.find((c) => c.id === selectedCharacterId)
  }, [characters, selectedCharacterId])

  const totalMinutes = days * 24 * 60 + hours * 60 + minutes

  const handleSubmit = async () => {
    if (!selectedCharacter || !selectedQuest) return

    const now = new Date()
    const expiresAt = new Date(now.getTime() + totalMinutes * 60 * 1000)

    await addTimer({
      characterId: selectedCharacter.id,
      characterName: selectedCharacter.name,
      questId: selectedQuest.id,
      questName: selectedQuest.name,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      playerName,
    })

    onClose()
  }

  const isValid = selectedCharacter && selectedQuest && totalMinutes > 0

  return (
    <>
      <DialogTitle>Add Ransack Timer</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="character-select-label">Character</InputLabel>
            <Select
              labelId="character-select-label"
              value={selectedCharacterId}
              label="Character"
              onChange={(e) => setSelectedCharacterId(e.target.value)}
            >
              {characters.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} {c.is_online && '(online)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            options={questOptions}
            value={selectedQuest}
            onChange={(_, newValue) => setSelectedQuest(newValue)}
            getOptionLabel={(option) => `${option.name}${option.level ? ` (${option.level})` : ''}`}
            renderInput={(params) => <TextField {...params} label="Quest" />}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Days"
              type="number"
              value={days}
              onChange={(e) => setDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
              inputProps={{ min: 0, max: 14 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Hours"
              type="number"
              value={hours}
              onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
              inputProps={{ min: 0, max: 23 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              inputProps={{ min: 0, max: 59 }}
              sx={{ flex: 1 }}
            />
          </Box>

          {selectedQuest && totalMinutes > 0 && (
            <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Timer duration: {formatDuration(days, hours, minutes)} from now
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValid}>
          Add Timer
        </Button>
      </DialogActions>
    </>
  )
}

export default function AddRansackTimerDialog({
  open,
  onClose,
  playerName,
  characters,
  defaultCharacterId,
  defaultQuestId,
}: AddRansackTimerDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <FormContent
          onClose={onClose}
          playerName={playerName}
          characters={characters}
          defaultCharacterId={defaultCharacterId}
          defaultQuestId={defaultQuestId}
        />
      )}
    </Dialog>
  )
}
