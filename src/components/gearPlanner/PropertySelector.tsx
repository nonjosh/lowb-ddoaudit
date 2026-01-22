import React, { useState } from 'react'

import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  TextField,
  Typography
} from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

interface PropertySelectorProps {
  availableProperties: string[]
  selectedProperties: string[]
  onChange: (properties: string[]) => void
}

export default function PropertySelector({
  availableProperties,
  selectedProperties,
  onChange
}: PropertySelectorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newProperties = [...selectedProperties]
    const draggedItem = newProperties[draggedIndex]
    newProperties.splice(draggedIndex, 1)
    newProperties.splice(dropIndex, 0, draggedItem)

    onChange(newProperties)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Properties to Optimize
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select 3 or more properties to find the best gear combinations. Drag to reorder.
      </Typography>
      <FormControl fullWidth>
        <Autocomplete
          multiple
          options={availableProperties}
          value={selectedProperties}
          onChange={(_, newValue) => onChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Properties"
              placeholder={selectedProperties.length === 0 ? "Select properties..." : ""}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { onDelete, ...chipProps } = getTagProps({ index })
              const isDragging = draggedIndex === index
              const isDragOver = dragOverIndex === index
              return (
                <Box
                  key={option}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    display: 'inline-flex',
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    borderLeft: isDragOver ? '3px solid' : 'none',
                    borderColor: 'primary.main',
                    '&:active': { cursor: 'grabbing' }
                  }}
                >
                  <Chip
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DragIndicatorIcon sx={{ fontSize: 16 }} />
                        {option}
                      </Box>
                    }
                    {...chipProps}
                    onDelete={onDelete}
                  />
                </Box>
              )
            })
          }
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          {selectedProperties.length} properties selected
          {selectedProperties.length < 3 && selectedProperties.length > 0 &&
            ` (minimum 3 required)`}
        </Typography>
      </FormControl>
    </Box>
  )
}
