import { useState, useMemo } from 'react'

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
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from '@mui/material'

import { CraftingData, CraftingOption } from '@/api/ddoGearPlanner'
import { formatAffix } from '@/utils/affixHelpers'
import { generateCraftingOptionName } from '@/domains/gearPlanner/augmentHelpers'
import {
  filterCraftingOptionsByML,
  getAvailableCraftingOptions
} from '@/domains/gearPlanner/craftingHelpers'

interface AugmentSelectionDialogProps {
  open: boolean
  onClose: () => void
  slotType: string
  itemName: string
  itemML: number
  currentOption: CraftingOption | null
  craftingData: CraftingData | null
  onSelect: (option: CraftingOption | null) => void
}

export default function AugmentSelectionDialog({
  open,
  onClose,
  slotType,
  itemName,
  itemML,
  currentOption,
  craftingData,
  onSelect
}: AugmentSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const availableOptions = useMemo(() => {
    const options = getAvailableCraftingOptions(craftingData, slotType, itemName)
    return filterCraftingOptionsByML(options, itemML)
  }, [craftingData, slotType, itemName, itemML])

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return availableOptions
    const term = searchTerm.toLowerCase()
    return availableOptions.filter(opt => {
      const name = generateCraftingOptionName(opt).toLowerCase()
      if (name.includes(term)) return true
      if (opt.affixes?.some(a => a.name.toLowerCase().includes(term))) return true
      return false
    })
  }, [availableOptions, searchTerm])

  const currentName = currentOption ? generateCraftingOptionName(currentOption) : null

  function handleSelect(option: CraftingOption | null) {
    onSelect(option)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Select: {slotType}</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search augments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
          autoFocus
        />
        <List dense disablePadding sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {/* None option */}
          <ListItemButton
            selected={!currentOption}
            onClick={() => handleSelect(null)}
          >
            <ListItemText
              primary={<Typography variant="body2" color="text.secondary">(None)</Typography>}
            />
          </ListItemButton>

          {filteredOptions.map((opt, idx) => {
            const name = generateCraftingOptionName(opt)
            const isSelected = currentName === name
            return (
              <ListItemButton
                key={idx}
                selected={isSelected}
                onClick={() => handleSelect(opt)}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                      {name}
                      {opt.ml !== undefined && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          (ML {opt.ml})
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    opt.affixes && opt.affixes.length > 0 ? (
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                        {opt.affixes.map((affix, i) => (
                          <Typography key={i} variant="caption" color="text.secondary" component="span" display="block">
                            {formatAffix(affix)}
                          </Typography>
                        ))}
                        {opt.set && (
                          <Typography variant="caption" color="secondary.main" component="span" display="block">
                            Set: {opt.set}
                          </Typography>
                        )}
                      </Box>
                    ) : opt.set ? (
                      <Typography variant="caption" color="secondary.main" component="span" display="block">
                        Set: {opt.set}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItemButton>
            )
          })}

          {filteredOptions.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No augments found
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
