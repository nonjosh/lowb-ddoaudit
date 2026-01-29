import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  IconButton,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'

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
  const handleMoveToEnd = (index: number) => {
    if (index === selectedProperties.length - 1) return // Already at end
    const newProperties = [...selectedProperties]
    const [item] = newProperties.splice(index, 1)
    newProperties.push(item)
    onChange(newProperties)
  }

  const handleMoveToStart = (index: number) => {
    if (index === 0) return // Already at start
    const newProperties = [...selectedProperties]
    const [item] = newProperties.splice(index, 1)
    newProperties.unshift(item)
    onChange(newProperties)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Properties to Optimize
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select 3 or more properties to find the best gear combinations. Use the arrow buttons to reorder.
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
              const { onDelete, key, ...chipProps } = getTagProps({ index })
              return (
                <Chip
                  key={key}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {option}
                      {index > 0 && (
                        <Tooltip title="Move to start">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveToStart(index)
                            }}
                            sx={{ p: 0, ml: 0.5 }}
                          >
                            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {index < value.length - 1 && (
                        <Tooltip title="Move to end">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveToEnd(index)
                            }}
                            sx={{ p: 0, ml: 0.5 }}
                          >
                            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  }
                  {...chipProps}
                  onDelete={onDelete}
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
