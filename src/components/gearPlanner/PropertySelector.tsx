import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  TextField,
  Typography
} from '@mui/material'

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
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Properties to Optimize
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select 3 or more properties to find the best gear combinations
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
            value.map((option, index) => (
              <Chip
                label={option}
                {...getTagProps({ index })}
                key={option}
              />
            ))
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
