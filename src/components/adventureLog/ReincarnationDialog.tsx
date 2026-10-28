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
import { useState } from 'react'

interface ReincarnationDialogProps {
  open: boolean
  characterName: string
  /** ISO time of the currently recorded reincarnation, if any. */
  currentAt: string | null
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
  onClose,
  onConfirm,
}: ReincarnationDialogProps) {
  // The parent remounts this dialog on every open (keyed). Always default to "now":
  // pre-filling the recorded time made "Record & reset" a silent no-op.
  const [value, setValue] = useState(() => toLocalInput(new Date()))

  const parsed = new Date(value)
  const valid = value.length > 0 && !Number.isNaN(parsed.getTime())

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record a reincarnation</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Marks <strong>{characterName}</strong> as reincarnated at this time and unchecks every quest whose newest
            completion is older than it. Completion times are kept, so the previous life stays readable and ransack
            counting restarts from this point.
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
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onConfirm(parsed.toISOString())}>
          Record &amp; reset
        </Button>
      </DialogActions>
    </Dialog>
  )
}
