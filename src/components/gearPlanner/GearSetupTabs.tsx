import { useEffect, useRef, useState } from 'react'

import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { Box, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material'

import { SavedGearSetup } from '@/storage/gearPlannerDb'

interface GearSetupTabsProps {
  setups: SavedGearSetup[]
  activeSetupId: number | null
  onSelect: (id: number) => void
  onAdd: () => void
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
}

export default function GearSetupTabs({
  setups,
  activeSetupId,
  onSelect,
  onAdd,
  onRename,
  onDelete
}: GearSetupTabsProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {setups.map((setup) => (
        <Box key={setup.id}>
          {editingId === setup.id ? (
            <TextField
              inputRef={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleRenameSubmit(setup.id!)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(setup.id!)
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
                      {setup.name}
                    </Typography>
                    {setups.length > 1 && (
                      <CloseIcon
                        sx={{
                          fontSize: 14,
                          cursor: 'pointer',
                          opacity: 0.5,
                          '&:hover': { opacity: 1 }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(setup.id!)
                        }}
                      />
                    )}
                  </Box>
                }
                variant={activeSetupId === setup.id ? 'filled' : 'outlined'}
                color={activeSetupId === setup.id ? 'primary' : 'default'}
                onClick={() => onSelect(setup.id!)}
                onDoubleClick={() => handleDoubleClick(setup.id!, setup.name)}
                size="small"
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          )}
        </Box>
      ))}
      <Tooltip title="New gear setup">
        <IconButton size="small" onClick={onAdd} sx={{ ml: 0.5 }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
