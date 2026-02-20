import { useState, useMemo, useEffect } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  ToggleButton,
  Tooltip,
  Typography
} from '@mui/material'

import { Item } from '@/api/ddoGearPlanner'
import type { CraftingData, SetsData } from '@/api/ddoGearPlanner'
import { useTrove } from '@/contexts/useTrove'
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
}

export default function ItemSelectionDialog({
  open,
  onClose,
  items,
  currentItem,
  slotName,
  onSelect,
  craftingData,
  setsData
}: ItemSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showOwnedOnly, setShowOwnedOnly] = useState(false)
  const { isItemAvailableForCharacters, inventoryMap } = useTrove()

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

  // Compute default type filter - use current item type or first available type
  // This reduces the initial item list dramatically, improving performance
  const defaultTypeFilter = useMemo(() => {
    if (!open) return []
    if (uniqueTypes.length === 0) return []

    // If current item has a type, use that
    if (currentItem?.type && uniqueTypes.includes(currentItem.type)) {
      return [currentItem.type]
    }

    // Otherwise, use the first available type to limit the initial list
    return [uniqueTypes[0]]
  }, [open, uniqueTypes, currentItem])

  const [typeFilter, setTypeFilter] = useState<string[]>(defaultTypeFilter)

  // Update typeFilter when defaultTypeFilter changes (e.g., when dialog opens)
  useEffect(() => {
    setTypeFilter(defaultTypeFilter)
  }, [defaultTypeFilter])

  // Reset search term and owned filter when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setShowOwnedOnly(false)
    }
  }, [open])

  // Filter items by search term (name, affixes, or quests) and type
  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchLower) ||
      item.affixes.some(affix => affix.name.toLowerCase().includes(searchLower)) ||
      item.quests?.some(quest => quest.toLowerCase().includes(searchLower))

    const matchesType = typeFilter.length === 0 || (item.type && typeFilter.includes(item.type))

    const matchesOwned = !showOwnedOnly || isItemAvailableForCharacters(item.name)

    return matchesSearch && matchesType && matchesOwned
  })

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
          <Typography variant="h6">Select {slotName}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by item name, effect, or quest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
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
          {uniqueTypes.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Type</InputLabel>
              <Select
                multiple
                value={typeFilter}
                label="Filter by Type"
                input={<OutlinedInput label="Filter by Type" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                onChange={(e) => {
                  const value = e.target.value
                  setTypeFilter(typeof value === 'string' ? value.split(',') : value)
                }}
              >
                {uniqueTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
          sortByML={true}
          craftingData={craftingData}
          setsData={setsData}
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
