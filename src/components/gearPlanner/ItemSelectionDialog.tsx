import { useState, useMemo, useEffect, useCallback } from 'react'

import ClearAllIcon from '@mui/icons-material/ClearAll'
import CloseIcon from '@mui/icons-material/Close'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort'
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
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  Tooltip,
  Typography
} from '@mui/material'

import { Item } from '@/api/ddoGearPlanner'
import type { CraftingData, SetsData } from '@/api/ddoGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import { useQuestNameToPack } from '@/hooks/useQuestNameToPack'
import { formatAffix } from '@/utils/affixHelpers'
import InventoryBadge from './InventoryBadge'
import { ItemSelectionTable } from './ItemSelectionTable'

interface ItemSelectionDialogProps {
  open: boolean
  onClose: () => void
  items: Item[]
  currentItem?: Item
  slotName: string
  onSelect: (item: Item | undefined) => void
  craftingData?: CraftingData | null
  setsData?: SetsData | null
  getImprovementScores?: (candidates: Item[]) => Map<string, number>
  /** Page-level defaults for min/max level */
  defaultMinLevel?: number
  defaultMaxLevel?: number
  /** Page-level defaults for type filter */
  defaultTypeFilter?: string[]
  /** Page-level defaults for adventure pack filter */
  defaultPackFilter?: string[]
}

export default function ItemSelectionDialog({
  open,
  onClose,
  items,
  currentItem,
  slotName,
  onSelect,
  craftingData,
  setsData,
  getImprovementScores,
  defaultMinLevel,
  defaultMaxLevel,
  defaultTypeFilter: externalDefaultTypeFilter,
  defaultPackFilter,
}: ItemSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showOwnedOnly, setShowOwnedOnly] = useState(false)
  const [sortByScore, setSortByScore] = useState(false)
  const [minLevel, setMinLevel] = useState<number>(defaultMinLevel ?? 1)
  const [maxLevel, setMaxLevel] = useState<number>(defaultMaxLevel ?? 34)
  const [packFilter, setPackFilter] = useState<string[]>(defaultPackFilter ?? [])
  const { isItemAvailableForCharacters, inventoryMap } = useTrove()
  const questNameToPack = useQuestNameToPack()

  // Only show the owned filter when Trove data is imported
  const hasTroveData = inventoryMap.size > 0

  // Get unique types from items for filtering
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>()
    items.forEach(item => {
      if (item.type) types.add(item.type)
    })
    return Array.from(types).sort()
  }, [items])

  // Unique adventure packs from dialog items
  const uniquePacks = useMemo(() => {
    const packSet = new Set<string>()
    items.forEach(item => {
      if (item.quests) {
        item.quests.forEach(qName => {
          const pack = questNameToPack.get(qName)
          if (pack) packSet.add(pack)
        })
      }
    })
    return Array.from(packSet).sort()
  }, [items, questNameToPack])

  // Compute default type filter - use external default, current item type, or first available type
  const defaultTypeFilter = useMemo(() => {
    if (!open) return []
    if (uniqueTypes.length === 0) return []

    // Use external default if provided and applicable
    if (externalDefaultTypeFilter && externalDefaultTypeFilter.length > 0) {
      const applicable = externalDefaultTypeFilter.filter(t => uniqueTypes.includes(t))
      if (applicable.length > 0) return applicable
    }

    // If current item has a type, use that
    if (currentItem?.type && uniqueTypes.includes(currentItem.type)) {
      return [currentItem.type]
    }

    // Otherwise, use the first available type to limit the initial list
    return [uniqueTypes[0]]
  }, [open, uniqueTypes, currentItem, externalDefaultTypeFilter])

  const [typeFilter, setTypeFilter] = useState<string[]>(defaultTypeFilter)

  // Update typeFilter when defaultTypeFilter changes (e.g., when dialog opens)
  useEffect(() => {
    setTypeFilter(defaultTypeFilter)
  }, [defaultTypeFilter])

  // Update packFilter when defaultPackFilter changes (e.g., when dialog opens)
  useEffect(() => {
    setPackFilter(defaultPackFilter ?? [])
  }, [defaultPackFilter])

  // Reset all filters when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setShowOwnedOnly(false)
      setSortByScore(false)
      setMinLevel(defaultMinLevel ?? 1)
      setMaxLevel(defaultMaxLevel ?? 34)
      setPackFilter(defaultPackFilter ?? [])
    }
  }, [open, defaultMinLevel, defaultMaxLevel, defaultPackFilter])

  const hasActiveFilters = searchTerm !== '' || showOwnedOnly ||
    minLevel !== (defaultMinLevel ?? 1) || maxLevel !== (defaultMaxLevel ?? 34) ||
    packFilter.length !== (defaultPackFilter ?? []).length ||
    packFilter.some((p, i) => p !== (defaultPackFilter ?? [])[i]) ||
    (typeFilter.length > 0 && (typeFilter.length !== defaultTypeFilter.length ||
      typeFilter.some((t, i) => t !== defaultTypeFilter[i])))

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setShowOwnedOnly(false)
    setMinLevel(defaultMinLevel ?? 1)
    setMaxLevel(defaultMaxLevel ?? 34)
    setTypeFilter(defaultTypeFilter)
    setPackFilter(defaultPackFilter ?? [])
  }, [defaultTypeFilter, defaultMinLevel, defaultMaxLevel, defaultPackFilter])

  // Filter items by search term (name, affixes, or quests), type, level, and pack
  const filteredItems = useMemo(() => items.filter(item => {
    const matchesType = typeFilter.length === 0 || (item.type && typeFilter.includes(item.type))
    if (!matchesType) return false

    if (item.ml < minLevel) return false
    if (item.ml > maxLevel) return false

    // Pack filter
    if (packFilter.length > 0) {
      const itemPacks = item.quests?.map(q => questNameToPack.get(q)).filter(Boolean) as string[] | undefined
      if (!itemPacks || itemPacks.length === 0 || !itemPacks.some(p => packFilter.includes(p))) return false
    }

    const matchesOwned = !showOwnedOnly || isItemAvailableForCharacters(item.name)
    if (!matchesOwned) return false

    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return item.name.toLowerCase().includes(searchLower) ||
      item.affixes.some(affix => affix.name.toLowerCase().includes(searchLower)) ||
      item.quests?.some(quest => quest.toLowerCase().includes(searchLower))
  }), [items, searchTerm, typeFilter, showOwnedOnly, isItemAvailableForCharacters, minLevel, maxLevel, packFilter, questNameToPack])

  // Compute improvement scores when dialog is open
  const improvementScores = useMemo(() => {
    if (!open || !getImprovementScores) return undefined
    return getImprovementScores(filteredItems)
  }, [open, getImprovementScores, filteredItems])

  const handleSelect = (item: Item) => {
    onSelect(item)
    onClose()
  }

  const handleClear = () => {
    onSelect(undefined)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Select {slotName}</Typography>
            <Chip label={`${filteredItems.length} items`} size="small" variant="outlined" />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Row 1: Search + toggle buttons */}
        <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by item name, effect, or quest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }
            }}
          />
          {hasTroveData && (
            <Tooltip title="Show only items in your inventory">
              <ToggleButton
                value="owned"
                selected={showOwnedOnly}
                onChange={() => setShowOwnedOnly(prev => !prev)}
                size="small"
                color="primary"
                sx={{ whiteSpace: 'nowrap', px: 1.5 }}
              >
                <Inventory2Icon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                Owned
              </ToggleButton>
            </Tooltip>
          )}
          {improvementScores && (
            <Tooltip title="Sort by improvement score">
              <ToggleButton
                value="score"
                selected={sortByScore}
                onChange={() => setSortByScore(prev => !prev)}
                size="small"
                color="primary"
                sx={{ whiteSpace: 'nowrap', px: 1.5 }}
              >
                <SortIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                Score
              </ToggleButton>
            </Tooltip>
          )}
        </Box>

        {/* Row 2: Level range + Type filter + Clear */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Level Range: dropdown + slider */}
          <Box sx={{ minWidth: 250, maxWidth: 350, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Level Range:</Typography>
              <FormControl size="small">
                <Select
                  variant="standard"
                  disableUnderline
                  value={minLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val <= maxLevel) setMinLevel(val)
                  }}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {Array.from({ length: 34 }, (_, i) => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption">-</Typography>
              <FormControl size="small">
                <Select
                  variant="standard"
                  disableUnderline
                  value={maxLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val >= minLevel) setMaxLevel(val)
                  }}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {Array.from({ length: 34 }, (_, i) => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Slider
              value={[minLevel, maxLevel]}
              onChange={(_, newValue) => {
                if (Array.isArray(newValue)) {
                  setMinLevel(newValue[0])
                  setMaxLevel(newValue[1])
                }
              }}
              valueLabelDisplay="auto"
              min={1}
              max={34}
              size="small"
            />
          </Box>
          {uniqueTypes.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select
                multiple
                value={typeFilter}
                label="Type"
                input={<OutlinedInput label="Type" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.length === uniqueTypes.length ? (
                      <Chip label="All types" size="small" />
                    ) : (
                      selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))
                    )}
                  </Box>
                )}
                onChange={(e) => {
                  const value = e.target.value
                  setTypeFilter(typeof value === 'string' ? value.split(',') : value)
                }}
              >
                <MenuItem
                  dense
                  onClick={(e) => {
                    e.preventDefault()
                    setTypeFilter(typeFilter.length === uniqueTypes.length ? [] : [...uniqueTypes])
                  }}
                >
                  <Checkbox
                    checked={typeFilter.length === uniqueTypes.length}
                    indeterminate={typeFilter.length > 0 && typeFilter.length < uniqueTypes.length}
                    size="small"
                  />
                  <ListItemText primary={typeFilter.length === uniqueTypes.length ? 'Deselect All' : 'Select All'} />
                </MenuItem>
                <Divider />
                {uniqueTypes.map(type => (
                  <MenuItem key={type} value={type} dense>
                    <Checkbox checked={typeFilter.includes(type)} size="small" />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {/* Adventure Pack filter */}
          {uniquePacks.length > 0 && (
            <Autocomplete
              multiple
              size="small"
              limitTags={1}
              options={uniquePacks}
              value={packFilter}
              onChange={(_, newValue) => setPackFilter(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Adventure Pack"
                  placeholder="Select pack..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  return <Chip key={key} {...tagProps} label={option} size="small" />
                })
              }
              sx={{ minWidth: 200, flex: 1 }}
            />
          )}
          {hasActiveFilters && (
            <Tooltip title="Reset all filters">
              <IconButton size="small" onClick={handleClearFilters} color="warning">
                <ClearAllIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Currently Equipped Item with Effects */}
        {currentItem && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" gutterBottom>
              Currently Equipped
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {currentItem.name}
              </Typography>
              <InventoryBadge itemName={currentItem.name} showBTC />
              <Typography variant="caption" color="text.secondary">
                (ML {currentItem.ml})
              </Typography>
            </Box>
            {/* Show all effects of current item */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, ml: 2 }}>
              {currentItem.affixes.map((affix, idx) => (
                <Typography key={idx} variant="caption" color="text.secondary">
                  {formatAffix(affix)}
                </Typography>
              ))}
            </Box>
          </Paper>
        )}

        {/* Reusable Item Selection Table */}
        <ItemSelectionTable
          items={filteredItems}
          currentItem={currentItem}
          onSelect={handleSelect}
          maxHeight={500}
          sortByML={!sortByScore}
          craftingData={craftingData}
          setsData={setsData}
          improvementScores={improvementScores}
          sortByScore={sortByScore}
        />
      </DialogContent>
      <DialogActions>
        {currentItem && (
          <Button onClick={handleClear} color="warning">
            Clear Slot
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
