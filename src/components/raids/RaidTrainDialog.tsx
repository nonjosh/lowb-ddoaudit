import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { useEffect, useMemo, useState } from 'react'

import RaidTrainAvailability from '@/components/shared/RaidTrainAvailability'
import { useLfm } from '@/contexts/useLfm'
import { RaidGroup } from '@/domains/raids/raidLogic'
import { getRaidUpdate } from '@/domains/raids/raidUpdates'

interface RaidTrainDialogProps {
  open: boolean
  onClose: () => void
  raidGroups: RaidGroup[]
}

export default function RaidTrainDialog({ open, onClose, raidGroups }: RaidTrainDialogProps) {
  const [selectedRaids, setSelectedRaids] = useState<RaidGroup[]>([])
  const [now, setNow] = useState(() => new Date())
  const { lfms } = useLfm()

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [open])

  const handleClose = () => {
    setSelectedRaids([])
    onClose()
  }

  // Build a set of quest IDs that have active LFMs
  const lfmQuestIds = useMemo(() => {
    const ids = new Set<string>()
    for (const l of Object.values(lfms ?? {})) {
      ids.add(String(l?.quest_id ?? ''))
    }
    return ids
  }, [lfms])

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Raid Train Checker</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select raids for your train to see which characters can do all of them.
        </Typography>
        <Autocomplete
          multiple
          options={raidGroups}
          disableCloseOnSelect
          getOptionLabel={(option) => {
            const update = getRaidUpdate(option.raidName)
            return update ? `[${update}] ${option.raidName}` : option.raidName
          }}
          isOptionEqualToValue={(option, value) => option.questId === value.questId}
          value={selectedRaids}
          onChange={(_event, newValue) => setSelectedRaids(newValue)}
          renderOption={(props, option, { selected }) => {
            const { key, ...rest } = props
            const update = getRaidUpdate(option.raidName)
            const hasLfm = lfmQuestIds.has(option.questId)
            return (
              <li key={key} {...rest}>
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  checked={selected}
                  sx={{ mr: 1 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  {update && (
                    <Chip label={update} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                  <Typography variant="body2">{option.raidName}</Typography>
                  {hasLfm && (
                    <ListAltIcon sx={{ width: 16, height: 16, color: 'action.active', ml: 'auto' }} />
                  )}
                </Box>
              </li>
            )
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select raids"
              placeholder="Search raids…"
              size="small"
            />
          )}
          sx={{ mb: 2 }}
        />
        {selectedRaids.length >= 2 && (
          <RaidTrainAvailability selectedRaids={selectedRaids} now={now} />
        )}
        {selectedRaids.length === 1 && (
          <Typography variant="body2" color="text.secondary">
            Select at least one more raid to see the train availability.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
