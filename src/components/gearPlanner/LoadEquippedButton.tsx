import { useState } from 'react'

import PersonIcon from '@mui/icons-material/Person'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from '@mui/material'

import { useTrove } from '@/contexts/useTrove'

interface LoadEquippedButtonProps {
  onLoadEquipped: (characterId: number) => void
}

export default function LoadEquippedButton({
  onLoadEquipped
}: LoadEquippedButtonProps) {
  const { characters, inventoryMap } = useTrove()
  const [open, setOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<number | ''>('')

  if (inventoryMap.size === 0 || characters.length === 0) {
    return null
  }

  const handleOpen = () => setOpen(true)
  const handleClose = () => {
    setOpen(false)
    setSelectedCharacter('')
  }

  const handleLoad = () => {
    if (selectedCharacter !== '') {
      onLoadEquipped(selectedCharacter)
      handleClose()
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PersonIcon />}
        onClick={handleOpen}
      >
        Load Equipped Gear
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Load Character's Equipped Gear</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Character</InputLabel>
            <Select
              value={selectedCharacter}
              label="Character"
              onChange={(e) => setSelectedCharacter(e.target.value as number)}
            >
              {characters.map((char) => (
                <MenuItem key={char.id} value={char.id}>
                  {char.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLoad}
            disabled={selectedCharacter === ''}
          >
            Load
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
