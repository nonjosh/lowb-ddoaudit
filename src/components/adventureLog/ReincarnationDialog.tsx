import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { CompletionEntry } from '@/api/adventureLog'

interface ReincarnationDialogProps {
  open: boolean
  characterName: string
  /** ISO time of the currently recorded reincarnation, if any. */
  currentAt: string | null
  /** This character's rows, used for the "N quests" preview. */
  entries: CompletionEntry[]
  onClose: () => void
  onConfirm: (atIso: string) => void
}

/** `datetime-local` wants local time without a timezone suffix. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function ReincarnationDialog({
  open,
  characterName,
  currentAt,
  entries,
  onClose,
  onConfirm,
}: ReincarnationDialogProps) {
  // The parent remounts this dialog on every open (keyed), so this default is
  // evaluated per opening. Always "now": pre-filling the recorded time made the
  // action a silent no-op.
  const [value, setValue] = useState(() => toLocalInput(new Date()))
  const [step, setStep] = useState<'details' | 'confirm'>('details')

  const parsedTime = useMemo(() => new Date(value).getTime(), [value])
  const valid = value.length > 0 && Number.isFinite(parsedTime)

  // Mirrors the server: a row flips when its newest completion is older than the
  // reincarnation; rows without any timestamp are unchecked too.
  const { willUncheck, willRecheck } = useMemo(() => {
    if (!valid) return { willUncheck: 0, willRecheck: 0 }
    let uncheck = 0
    let recheck = 0
    for (const entry of entries) {
      const newest = entry.history[0]
      const newestTime = newest ? new Date(newest).getTime() : null
      const after = newestTime !== null && newestTime >= parsedTime
      if (entry.finished && !after) uncheck += 1
      if (!entry.finished && after) recheck += 1
    }
    return { willUncheck: uncheck, willRecheck: recheck }
  }, [entries, parsedTime, valid])

  const close = () => {
    setStep('details')
    onClose()
  }

  if (step === 'confirm') {
    return (
      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm reincarnation</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Record a reincarnation for <strong>{characterName}</strong> at{' '}
              <strong>{new Date(parsedTime).toLocaleString()}</strong>?
            </Typography>
            <Alert severity={willUncheck > 0 ? 'warning' : 'info'}>
              {willUncheck > 0
                ? `${willUncheck} quest${willUncheck === 1 ? '' : 's'} will be unchecked.`
                : 'No checkbox will be unchecked at that time.'}
              {willRecheck > 0 ? ` ${willRecheck} would be re-checked from this life's runs.` : ''}
            </Alert>
            <Typography variant="caption" color="text.secondary">
              Completion times are kept; only the checkboxes move to the new life. An earlier time than the recorded
              one is ignored, because the reincarnation time never moves backwards.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStep('details')}>Back</Button>
          <Button color="warning" variant="contained" onClick={() => onConfirm(new Date(parsedTime).toISOString())}>
            Record &amp; reset
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Record a reincarnation</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Marks <strong>{characterName}</strong> as reincarnated and unchecks every quest whose newest completion is
            older than that time. Completion times are kept, so the previous life stays readable and ransack counting
            restarts from this point.
          </Typography>
          <Alert severity="info">
            Auto-detection only fires on a drop to level 5 or below followed by a level 1-3 quest. Use this for iconic
            reincarnations (level 15) or Otto&apos;s Box leveling.
          </Alert>
          <TextField
            label="Reincarnation time"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          {currentAt && (
            <Typography variant="caption" color="text.secondary">
              Currently recorded: {new Date(currentAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={() => setStep('confirm')}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  )
}
