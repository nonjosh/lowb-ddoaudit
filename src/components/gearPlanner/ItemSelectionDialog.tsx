import { useState } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography
} from '@mui/material'

import { Item } from '@/api/ddoGearPlanner'
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
}

export default function ItemSelectionDialog({
  open,
  onClose,
  items,
  currentItem,
  slotName,
  onSelect
}: ItemSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter items by search term (name, affixes, or quests)
  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase()
    if (item.name.toLowerCase().includes(searchLower)) return true

    // Search in affixes
    if (item.affixes.some(affix => affix.name.toLowerCase().includes(searchLower))) return true

    // Search in quest names
    if (item.quests?.some(quest => quest.toLowerCase().includes(searchLower))) return true

    return false
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
        <Box sx={{ mb: 2 }}>
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
