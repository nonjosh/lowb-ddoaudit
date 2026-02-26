import { useEffect, useRef, useState } from 'react'

import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'

import { SavedPropertyPreset } from '@/storage/gearPlannerDb'

interface PropertyPresetSelectorProps {
  presets: SavedPropertyPreset[]
  activePresetId: number | null
  onSelect: (id: number) => void
  onSave: (name: string) => void
  onUpdate: (id: number) => void
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
  hasProperties: boolean
}

export default function PropertyPresetSelector({
  presets,
  activePresetId,
  onSelect,
  onSave,
  onUpdate,
  onRename,
  onDelete,
  hasProperties
}: PropertyPresetSelectorProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleDoubleClick = (id: number, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const handleRenameSubmit = (id: number) => {
    const trimmed = editName.trim()
    if (trimmed) {
      onRename(id, trimmed)
    }
    setEditingId(null)
  }

  const handleSaveSubmit = () => {
    const trimmed = presetName.trim()
    if (trimmed) {
      onSave(trimmed)
      setPresetName('')
      setSaveDialogOpen(false)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Presets:
        </Typography>
        {presets.map((preset) => (
          <Box key={preset.id}>
            {editingId === preset.id ? (
              <TextField
                inputRef={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(preset.id!)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(preset.id!)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                size="small"
                sx={{ minWidth: 120 }}
                slotProps={{ input: { sx: { py: 0.25, px: 1, fontSize: '0.8125rem' } } }}
              />
            ) : (
              <Tooltip title="Double-click to rename" enterDelay={800}>
                <Chip
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.8125rem'
                        }}
                      >
                        {preset.name}
                      </Typography>
                      <CloseIcon
                        sx={{
                          fontSize: 14,
                          cursor: 'pointer',
                          opacity: 0.5,
                          '&:hover': { opacity: 1 }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(preset.id!)
                        }}
                      />
                    </Box>
                  }
                  variant={activePresetId === preset.id ? 'filled' : 'outlined'}
                  color={activePresetId === preset.id ? 'primary' : 'default'}
                  onClick={() => onSelect(preset.id!)}
                  onDoubleClick={() => handleDoubleClick(preset.id!, preset.name)}
                  size="small"
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
          </Box>
        ))}

        {/* Save/Update buttons */}
        {hasProperties && (
          <>
            {activePresetId !== null && (
              <Tooltip title="Update current preset with current properties">
                <Button
                  size="small"
                  startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  onClick={() => onUpdate(activePresetId)}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 'auto', py: 0.25 }}
                >
                  Update
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Save current properties as a new preset">
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => setSaveDialogOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 'auto', py: 0.25 }}
              >
                Save As
              </Button>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Save Preset Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Property Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveSubmit()
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSubmit}
            disabled={!presetName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
