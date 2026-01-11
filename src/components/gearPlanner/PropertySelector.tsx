import { useState } from 'react'

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newProperties = [...selectedProperties]
    const draggedItem = newProperties[draggedIndex]
    newProperties.splice(draggedIndex, 1)
    newProperties.splice(index, 0, draggedItem)

    onChange(newProperties)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
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
              return (
                <Chip
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DragIndicatorIcon sx={{ fontSize: 16, cursor: 'grab' }} />
                      {option}
                    </Box>
                  }
                  {...chipProps}
                  onDelete={onDelete}
                  key={option}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' }
                  }}
                />
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
