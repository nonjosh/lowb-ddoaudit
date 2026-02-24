import {
  Autocomplete,
  Box,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import FavoriteIcon from '@mui/icons-material/Favorite'
import InventoryIcon from '@mui/icons-material/Inventory'
import { forwardRef } from 'react'

interface ItemTableFiltersProps {
  mode?: 'default' | 'wiki'
  searchText: string
  setSearchText: (value: string) => void
  typeFilter: string[]
  setTypeFilter: (value: string[]) => void
  effectFilter: string[]
  setEffectFilter: (value: string[]) => void
  uniqueTypes: Array<{ type: string; count: number; display: string; category: number }>
  uniqueEffects: Array<{ effect: string; count: number }>
  // Default ML Filter
  mlFilter?: string[]
  setMlFilter?: (value: string[]) => void
  uniqueMLs?: Array<{ ml: number; count: number }>
  // Wiki ML Range
  minMl?: number
  maxMl?: number
  setMinMl?: (val: number) => void
  setMaxMl?: (val: number) => void
  // Wiki Quest Search
  packFilter?: string[]
  setPackFilter?: (val: string[]) => void
  questFilter?: string[]
  setQuestFilter?: (val: string[]) => void
  uniquePacks?: Array<{ pack: string; mlRange: string }>
  uniqueQuests?: Array<{ name: string; pack: string; mlRange: string }>
  // Wiki Crafting Filter
  craftingFilter?: string[]
  setCraftingFilter?: (val: string[]) => void
  uniqueCraftingSlots?: Array<{ slot: string; count: number }>
  // Wiki Toggle Filters
  showAvailableOnly?: boolean
  setShowAvailableOnly?: (val: boolean) => void
  showWishlistOnly?: boolean
  setShowWishlistOnly?: (val: boolean) => void
  hasTroveData?: boolean
}

const ItemTableFilters = forwardRef<HTMLDivElement, ItemTableFiltersProps>(({
  mode = 'default',
  searchText,
  setSearchText,
  typeFilter,
  setTypeFilter,
  effectFilter,
  setEffectFilter,
  uniqueTypes,
  uniqueEffects,
  mlFilter = [],
  setMlFilter,
  uniqueMLs = [],
  minMl = 1,
  maxMl = 34,
  setMinMl,
  setMaxMl,
  packFilter = [],
  setPackFilter,
  questFilter = [],
  setQuestFilter,
  uniquePacks = [],
  uniqueQuests = [],
  craftingFilter = [],
  setCraftingFilter,
  uniqueCraftingSlots = [],
  showAvailableOnly = false,
  setShowAvailableOnly,
  showWishlistOnly = false,
  setShowWishlistOnly,
  hasTroveData = false,
}, ref) => {
  return (
    <Box ref={ref} sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', mb: 0, pt: 1.5, px: 1, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
      <Stack spacing={1.5}>
        {/* Row 1: Search */}
        <TextField
          label="Search Item Name/Properties"
          variant="outlined"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
          placeholder={mode === 'wiki' ? "Search by name, set, or properties..." : "Search..."}
          InputProps={{
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchText('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />

        {/* Row 2 (wiki): Pack + Quest */}
        {mode === 'wiki' && setPackFilter && setQuestFilter && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Autocomplete
              multiple
              fullWidth
              size="small"
              limitTags={1}
              options={uniquePacks}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option.mlRange ? `${option.pack} (${option.mlRange})` : option.pack
              }}
              isOptionEqualToValue={(option, value) => {
                const optPack = typeof option === 'string' ? option : option.pack
                const valPack = typeof value === 'string' ? value : value.pack
                return optPack === valPack
              }}
              value={uniquePacks.filter(p => packFilter.includes(p.pack))}
              onChange={(_, newValue) => setPackFilter(newValue.map(v => typeof v === 'string' ? v : v.pack))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Adventure Pack"
                  placeholder="Select pack..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  return <Chip key={key} {...tagProps} label={typeof option === 'string' ? option : option.pack} size="small" />
                })
              }
            />
            <Autocomplete
              multiple
              fullWidth
              size="small"
              limitTags={1}
              options={uniqueQuests}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option.mlRange ? `${option.name} (${option.mlRange})` : option.name
              }}
              isOptionEqualToValue={(option, value) => {
                const optName = typeof option === 'string' ? option : option.name
                const valName = typeof value === 'string' ? value : value.name
                return optName === valName
              }}
              value={uniqueQuests.filter(q => questFilter.includes(q.name))}
              onChange={(_, newValue) => {
                setQuestFilter(newValue.map(v => typeof v === 'string' ? v : v.name))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Quest"
                  placeholder="Select quest..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  return <Chip key={key} {...tagProps} label={typeof option === 'string' ? option : option.name} size="small" />
                })
              }
            />
          </Stack>
        )}

        {/* Row 3 (wiki): Type + Crafting on own row for better width */}
        {mode === 'wiki' && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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
                endAdornment={typeFilter.length > 0 ? (
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <IconButton size="small" onMouseDown={(e) => e.stopPropagation()} onClick={() => setTypeFilter([])}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null}
              >
                {uniqueTypes.flatMap(({ type, count, display, category }, index) => {
                  const menuItems = []
                  if (index > 0 && category !== uniqueTypes[index - 1].category) {
                    menuItems.push(<Divider key={`divider-${type}`} />)
                  }
                  menuItems.push(<MenuItem key={type} value={type}>{display} ({count})</MenuItem>)
                  return menuItems
                })}
              </Select>
            </FormControl>

            {setCraftingFilter && (
              <Autocomplete
                multiple
                fullWidth
                size="small"
                limitTags={2}
                options={uniqueCraftingSlots}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.slot} (${option.count})`}
                isOptionEqualToValue={(option, value) => {
                  const optSlot = typeof option === 'string' ? option : option.slot
                  const valSlot = typeof value === 'string' ? value : value.slot
                  return optSlot === valSlot
                }}
                value={uniqueCraftingSlots.filter(c => craftingFilter.includes(c.slot))}
                onChange={(_, newValue) => {
                  setCraftingFilter(newValue.map(v => typeof v === 'string' ? v : v.slot))
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Augments/Crafting" placeholder="Select slot..." />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })
                    return <Chip key={key} {...tagProps} label={typeof option === 'string' ? option : option.slot} size="small" />
                  })
                }
              />
            )}
          </Stack>
        )}

        {/* Row 4: Effect + ML + toggles */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          {/* Type filter (default mode only - wiki mode renders it in Row 3) */}
          {mode === 'default' && (
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
                endAdornment={typeFilter.length > 0 ? (
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <IconButton size="small" onMouseDown={(e) => e.stopPropagation()} onClick={() => setTypeFilter([])}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null}
              >
                {uniqueTypes.flatMap(({ type, count, display, category }, index) => {
                  const menuItems = []
                  if (index > 0 && category !== uniqueTypes[index - 1].category) {
                    menuItems.push(<Divider key={`divider-${type}`} />)
                  }
                  menuItems.push(<MenuItem key={type} value={type}>{display} ({count})</MenuItem>)
                  return menuItems
                })}
              </Select>
            </FormControl>
          )}

          <Autocomplete
            multiple
            fullWidth
            size="small"
            limitTags={2}
            options={uniqueEffects}
            getOptionLabel={(option) => option.effect}
            value={uniqueEffects.filter(e => effectFilter.includes(e.effect))}
            onChange={(_, newValue) => {
              setEffectFilter(newValue.map(v => v.effect))
            }}
            renderInput={(params) => (
              <TextField {...params} label="Filter by Effect" placeholder="Search effects..." />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <li key={key} {...otherProps}>
                  {option.effect} ({option.count})
                </li>
              )
            }}
          />

          {mode === 'default' && setMlFilter && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
                {uniqueMLs.map(({ ml, count }) => (
                  <MenuItem key={ml} value={ml.toString()}>{ml} ({count})</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === 'wiki' && setMinMl && setMaxMl && (
            <Box sx={{ width: '100%', px: 2, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Level Range:</Typography>
                <FormControl size="small">
                  <Select
                    variant="standard"
                    disableUnderline
                    value={minMl ?? 1}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val <= (maxMl ?? 34)) setMinMl(val)
                    }}
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {[...Array(34).keys()].map(i => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption">-</Typography>
                <FormControl size="small">
                  <Select
                    variant="standard"
                    disableUnderline
                    value={maxMl ?? 34}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val >= (minMl ?? 1)) setMaxMl(val)
                    }}
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {[...Array(34).keys()].map(i => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Slider
                value={[minMl ?? 1, maxMl ?? 34]}
                onChange={(_, newValue) => {
                  if (Array.isArray(newValue)) {
                    setMinMl(newValue[0])
                    setMaxMl(newValue[1])
                  }
                }}
                valueLabelDisplay="auto"
                min={1}
                max={34}
                size="small"
              />
            </Box>
          )}

          {mode === 'wiki' && (setShowWishlistOnly || (setShowAvailableOnly && hasTroveData)) && (
            <ToggleButtonGroup size="small" sx={{ flexShrink: 0 }}>
              {setShowAvailableOnly && hasTroveData && (
                <ToggleButton
                  value="available"
                  selected={showAvailableOnly}
                  onChange={() => setShowAvailableOnly(!showAvailableOnly)}
                  sx={{ textTransform: 'none', px: 1.5 }}
                >
                  <InventoryIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  In Trove
                </ToggleButton>
              )}
              {setShowWishlistOnly && (
                <ToggleButton
                  value="wishlist"
                  selected={showWishlistOnly}
                  onChange={() => setShowWishlistOnly(!showWishlistOnly)}
                  sx={{ textTransform: 'none', px: 1.5 }}
                >
                  <FavoriteIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  Wishlist
                </ToggleButton>
              )}
            </ToggleButtonGroup>
          )}
        </Stack>
      </Stack>
    </Box>
  )
})

export default ItemTableFilters
