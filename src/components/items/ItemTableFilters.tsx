import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField
} from '@mui/material'
import { forwardRef } from 'react'

interface ItemTableFiltersProps {
  searchText: string
  setSearchText: (value: string) => void
  typeFilter: string[]
  setTypeFilter: (value: string[]) => void
  effectFilter: string[]
  setEffectFilter: (value: string[]) => void
  uniqueTypes: Array<{ type: string; count: number; display: string; category: number }>
  uniqueEffects: Array<{ effect: string; count: number }>
  mlFilter: string[]
  setMlFilter: (value: string[]) => void
  uniqueMLs: Array<{ ml: number; count: number }>
}

const ItemTableFilters = forwardRef<HTMLDivElement, ItemTableFiltersProps>(({
  searchText,
  setSearchText,
  typeFilter,
  setTypeFilter,
  effectFilter,
  setEffectFilter,
  uniqueTypes,
  uniqueEffects,
  mlFilter,
  setMlFilter,
  uniqueMLs
}, ref) => {
  return (
    <Box ref={ref} sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', mb: 0, pt: 1.5, px: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            multiple
            value={typeFilter}
            input={<OutlinedInput label="Filter by Type" />}
            renderValue={(selected) => selected.join(', ')}
            onChange={(e) => {
              const value = e.target.value
              setTypeFilter(typeof value === 'string' ? value.split(',') : value)
            }}
          >
            {(() => {
              let prevCategory = -1
              return uniqueTypes.flatMap(({ type, count, display, category }) => {
                const items = []
                if (category !== prevCategory && prevCategory !== -1) {
                  items.push(<Divider key={`divider-${type}`} />)
                }
                items.push(<MenuItem key={type} value={type}>{display} ({count})</MenuItem>)
                prevCategory = category
                return items
              })
            })()}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Filter by Effect</InputLabel>
          <Select
            multiple
            value={effectFilter}
            input={<OutlinedInput label="Filter by Effect" />}
            renderValue={(selected) => selected.join(', ')}
            onChange={(e) => {
              const value = e.target.value
              setEffectFilter(typeof value === 'string' ? value.split(',') : value)
            }}
          >
            {uniqueEffects.map(({ effect, count }) => (
              <MenuItem key={effect} value={effect}>{effect} ({count})</MenuItem>
            ))}
          </Select>
        </FormControl>
        {uniqueMLs.length > 1 && (
          <FormControl size="small" fullWidth>
            <InputLabel>Filter by ML</InputLabel>
            <Select
              multiple
              value={mlFilter}
              input={<OutlinedInput label="Filter by ML" />}
              renderValue={(selected) => selected.join(', ')}
              onChange={(e) => {
                const value = e.target.value
                setMlFilter(typeof value === 'string' ? value.split(',') : value)
              }}
            >
              {uniqueMLs.sort((a, b) => b.ml - a.ml).map(({ ml, count }) => (
                <MenuItem key={ml} value={ml.toString()}>{ml} ({count})</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  )
})

ItemTableFilters.displayName = 'ItemTableFilters'

export default ItemTableFilters
