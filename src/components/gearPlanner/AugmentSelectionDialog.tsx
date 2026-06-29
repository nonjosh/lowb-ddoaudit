import { useMemo, useState } from 'react'

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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'

import { CraftingData, CraftingOption } from '@/api/ddoGearPlanner'
import { isLegendaryOption, isViktraniumSlot } from '@/domains/crafting/viktraniumLogic'
import { generateCraftingOptionName } from '@/domains/gearPlanner/augmentHelpers'
import { formatAffix } from '@/utils/affixHelpers'
import {
  filterCraftingOptionsByML,
  getAvailableCraftingOptions
} from '@/domains/gearPlanner/craftingHelpers'

type ViktraniumTierFilter = 'heroic' | 'epic'

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
  const [viktraniumTierFilter, setViktraniumTierFilter] = useState<ViktraniumTierFilter>('epic')

  const isViktranium = useMemo(() => isViktraniumSlot(slotType), [slotType])

  const availableOptions = useMemo(() => {
    const options = getAvailableCraftingOptions(craftingData, slotType, itemName)
    const mlFilteredOptions = filterCraftingOptionsByML(options, itemML, slotType)

    if (!isViktranium) {
      return mlFilteredOptions
    }

    return mlFilteredOptions.filter((opt) =>
      viktraniumTierFilter === 'heroic' ? !isLegendaryOption(opt) : isLegendaryOption(opt)
    )
  }, [craftingData, slotType, itemName, itemML, isViktranium, viktraniumTierFilter])

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return availableOptions
    const term = searchTerm.toLowerCase()
    return availableOptions.filter(opt => {
      const name = generateCraftingOptionName(opt).toLowerCase()
      if (name.includes(term)) return true
      if (opt.affixes?.some((affix) => formatAffix(affix).toLowerCase().includes(term))) return true
      if (opt.set?.toLowerCase().includes(term)) return true
      if (opt.ml !== undefined && `ml ${opt.ml}`.includes(term)) return true
      return false
    })
  }, [availableOptions, searchTerm])

  const currentName = currentOption ? generateCraftingOptionName(currentOption) : null

  function handleSelect(option: CraftingOption | null) {
    onSelect(option)
    onClose()
  }

  function formatEffectText(option: CraftingOption): string {
    const effectParts = option.affixes?.map((affix) => formatAffix(affix)) ?? []
    if (option.set) {
      effectParts.push(`Set: ${option.set}`)
    }
    return effectParts.join(', ')
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
        {isViktranium && (
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={viktraniumTierFilter}
            onChange={(_, value: ViktraniumTierFilter | null) => {
              if (value) setViktraniumTierFilter(value)
            }}
            size="small"
            sx={{ mb: 1 }}
          >
            <ToggleButton value="heroic">Heroic</ToggleButton>
            <ToggleButton value="epic">Epic</ToggleButton>
          </ToggleButtonGroup>
        )}
        <TextField
          fullWidth
          size="small"
          placeholder="Search augments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }
          }}
          sx={{ mb: 1 }}
          autoFocus
        />
        <Button
          variant={!currentOption ? 'contained' : 'text'}
          color={!currentOption ? 'primary' : 'inherit'}
          size="small"
          onClick={() => handleSelect(null)}
          sx={{ mb: 1 }}
        >
          (None)
        </Button>
        <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '38%' }}>Augment</TableCell>
                <TableCell>Effect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOptions.map((opt, idx) => {
                const name = generateCraftingOptionName(opt)
                const isSelected = currentName === name
                const effectText = formatEffectText(opt)

                return (
                  <TableRow
                    key={idx}
                    hover
                    onClick={() => handleSelect(opt)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'action.selected' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                        {name}
                      </Typography>
                      {opt.ml !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          ML {opt.ml}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={opt.set ? 'secondary.main' : 'text.secondary'}>
                        {effectText || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredOptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No augments found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
