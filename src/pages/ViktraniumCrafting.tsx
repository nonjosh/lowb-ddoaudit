import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { CraftingOption } from '@/api/ddoGearPlanner'
import IngredientProgressList from '@/components/shared/IngredientProgressList'
import type { IngredientGroup } from '@/components/shared/IngredientProgressList'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import {
  calculateViktraniumIngredients,
  getAugmentOptions,
  getViktraniumSlots,
  hasViktraniumSlots,
  LEGENDARY_ML_THRESHOLD,
  ViktraniumSlotType,
} from '@/domains/crafting/viktraniumLogic'
import { useCraftingStorage } from '@/hooks/useCraftingStorage'
import { formatAffixPlain } from '@/utils/affixHelpers'

// ============================================================================
// Types
// ============================================================================

interface PlannedSlot {
  slotType: ViktraniumSlotType
  selectedOption: CraftingOption | null
}

interface PlannedItem {
  id: string
  itemName: string
  slots: PlannedSlot[]
}

const VIKTRANIUM_INGREDIENT_GROUPS: IngredientGroup[] = [
  { label: 'Heroic Ingredients (ML 8)', filter: (name) => !name.startsWith('Legendary') },
  { label: 'Legendary Ingredients (ML 34)', filter: (name) => name.startsWith('Legendary') },
]

// ============================================================================
// Main Component
// ============================================================================

export default function ViktraniumCrafting() {
  const { items, craftingData, loading, refresh, error } = useGearPlanner()
  const { inventoryMap, importedAt } = useTrove()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [plannedItems, setPlannedItems] = useCraftingStorage<PlannedItem[]>(
    'crafting-viktranium-planned-items',
    [],
  )

  useEffect(() => {
    if (items.length === 0 && !loading && !error) {
      void refresh()
    }
  }, [items.length, loading, error, refresh])

  const viktraniumItems = useMemo(
    () => items.filter(hasViktraniumSlots).sort((a, b) => a.ml - b.ml || a.name.localeCompare(b.name)),
    [items],
  )

  const addItem = (itemName: string) => {
    const item = viktraniumItems.find((i) => i.name === itemName)
    if (!item) return
    const id = `${itemName}-${Date.now()}`
    const slots: PlannedSlot[] = getViktraniumSlots(item).map((slotType) => ({
      slotType,
      selectedOption: null,
    }))
    setPlannedItems((prev) => [...prev, { id, itemName, slots }])
  }

  const removeItem = (id: string) => {
    setPlannedItems((prev) => prev.filter((p) => p.id !== id))
  }

  const updateSlot = (itemId: string, slotType: ViktraniumSlotType, option: CraftingOption | null) => {
    setPlannedItems((prev) =>
      prev.map((p) => {
        if (p.id !== itemId) return p
        return {
          ...p,
          slots: p.slots.map((s) =>
            s.slotType === slotType ? { ...s, selectedOption: option } : s,
          ),
        }
      }),
    )
  }

  const allSelectedAugments = useMemo(
    () =>
      plannedItems
        .flatMap((p) => p.slots)
        .filter((s) => s.selectedOption !== null)
        .map((s) => ({ slotType: s.slotType, ml: s.selectedOption!.ml })),
    [plannedItems],
  )

  const ingredientSummary = useMemo(
    () => calculateViktraniumIngredients(allSelectedAugments),
    [allSelectedAugments],
  )

  const hasIngredients = Object.values(ingredientSummary).some((v) => v > 0)

  if (loading && items.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Viktranium Experiment Crafting</Typography>
          <DdoWikiLink wikiUrl="https://ddowiki.com/page/Viktranium_Experiment_crafting" />
          {importedAt && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Trove data loaded"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Plan your Viktranium augment slots and calculate required ingredients. Costs vary by slot
          type (Melancholic: 5/25×, Dolorous: 10/50×, Miserable/Woeful: varies). Items with ML ≤{' '}
          {LEGENDARY_ML_THRESHOLD} use Heroic ingredients; higher ML uses Legendary.
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Item Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Add Item to Plan
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={items.length === 0}
          >
            Browse Viktranium Items
          </Button>
          <Typography variant="body2" color="text.secondary">
            {viktraniumItems.length} items available
          </Typography>
        </Box>
      </Paper>

      {/* Item Browse Dialog */}
      <ViktraniumItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        items={viktraniumItems}
        onAdd={(name) => addItem(name)}
      />

      {/* Planned Items */}
      {plannedItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Planned Items
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plannedItems.map((planned) => {
              const item = viktraniumItems.find((i) => i.name === planned.itemName)
              const isLegendary = item ? item.ml > LEGENDARY_ML_THRESHOLD : false
              return (
                <Paper key={planned.id} variant="outlined" sx={{ p: 2 }}>
                  {/* Header row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {planned.itemName}
                    </Typography>
                    {item && (
                      <Chip label={`ML ${item.ml}`} size="small" variant="outlined" />
                    )}
                    {item && (
                      <Chip label={item.slot} size="small" variant="outlined" color="primary" />
                    )}
                    {item?.type && item.slot === 'Weapon' && (
                      <Chip label={item.type} size="small" variant="outlined" color="secondary" />
                    )}
                    <Chip
                      label={isLegendary ? 'Legendary' : 'Heroic'}
                      size="small"
                      color={isLegendary ? 'warning' : 'default'}
                      variant="filled"
                    />
                    <Box sx={{ flex: 1 }} />
                    <IconButton
                      size="small"
                      onClick={() => removeItem(planned.id)}
                      title="Remove item"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Augment slots — responsive grid */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    {planned.slots.map((slot) => (
                      <SlotSelector
                        key={slot.slotType}
                        slotType={slot.slotType}
                        selectedOption={slot.selectedOption}
                        craftingData={craftingData}
                        isLegendary={isLegendary}
                        onChange={(opt) => updateSlot(planned.id, slot.slotType, opt)}
                      />
                    ))}
                  </Box>
                </Paper>
              )
            })}
          </Box>
        </Paper>
      )}

      {plannedItems.length === 0 && (
        <Paper sx={{ p: 4, mb: 2, textAlign: 'center' }}>
          <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Browse and add a Viktranium item above to start planning your augments.
          </Typography>
        </Paper>
      )}

      {/* Ingredient Summary */}
      {hasIngredients && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Ingredient Summary
          </Typography>

          <IngredientProgressList
            summary={ingredientSummary}
            inventoryMap={inventoryMap}
            groups={VIKTRANIUM_INGREDIENT_GROUPS}
          />
        </Paper>
      )}
    </Container>
  )
}

// ============================================================================
// ViktraniumItemDialog Component
// ============================================================================

interface ViktraniumItemDialogProps {
  open: boolean
  onClose: () => void
  items: import('@/api/ddoGearPlanner').Item[]
  onAdd: (itemName: string) => void
}

/** Separator prefix for weapon-type filter values (e.g. "weapon:Bastard Swords") */
const WEAPON_TYPE_PREFIX = 'weapon:'

function ViktraniumItemDialog({ open, onClose, items, onAdd }: ViktraniumItemDialogProps) {
  const { hasItem } = useTrove()
  const [search, setSearch] = useState('')
  const [slotFilter, setSlotFilter] = useState('')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)

  /** Unique equipment slots (non-weapon) */
  const slots = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => {
      if (i.slot !== 'Weapon') s.add(i.slot)
    })
    return [...s].sort()
  }, [items])

  /** Unique weapon types */
  const weaponTypes = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => {
      if (i.slot === 'Weapon' && i.type) s.add(i.type)
    })
    return [...s].sort()
  }, [items])

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return items.filter((i) => {
      const matchName = !search || i.name.toLowerCase().includes(lower)

      let matchSlot = true
      if (slotFilter) {
        if (slotFilter === 'Weapon') {
          matchSlot = i.slot === 'Weapon'
        } else if (slotFilter.startsWith(WEAPON_TYPE_PREFIX)) {
          matchSlot = i.slot === 'Weapon' && i.type === slotFilter.slice(WEAPON_TYPE_PREFIX.length)
        } else {
          matchSlot = i.slot === slotFilter
        }
      }

      const matchAvailable = !showOnlyAvailable || hasItem(i.name)

      return matchName && matchSlot && matchAvailable
    })
  }, [items, search, slotFilter, showOnlyAvailable, hasItem])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Browse Viktranium Items</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} items
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel shrink>Slot</InputLabel>
            <Select
              value={slotFilter}
              label="Slot"
              displayEmpty
              onChange={(e) => setSlotFilter(e.target.value)}
            >
              <MenuItem value="">All slots</MenuItem>
              {/* Non-weapon equipment slots */}
              {slots.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
              {/* Weapon (all types) */}
              <MenuItem value="Weapon" sx={{ fontWeight: 'bold' }}>
                Weapon (all types)
              </MenuItem>
              {/* Weapon sub-types indented */}
              {weaponTypes.map((wt) => (
                <MenuItem key={wt} value={`${WEAPON_TYPE_PREFIX}${wt}`} sx={{ pl: 4 }}>
                  {wt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant={showOnlyAvailable ? 'contained' : 'outlined'}
            color={showOnlyAvailable ? 'success' : 'inherit'}
            onClick={() => setShowOnlyAvailable((v) => !v)}
            startIcon={<CheckCircleIcon />}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Available
          </Button>
        </Box>
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32, px: 0.5 }} />
                <TableCell>ML</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Slot / Type</TableCell>
                <TableCell>Crafting Slots</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => {
                const available = hasItem(item.name)
                return (
                  <TableRow key={item.name} hover>
                    <TableCell sx={{ px: 0.5, textAlign: 'center' }}>
                      {available && (
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      )}
                    </TableCell>
                    <TableCell>{item.ml}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={item.slot} size="small" variant="outlined" />
                        {item.slot === 'Weapon' && item.type && (
                          <Chip
                            label={item.type}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {(item.crafting ?? []).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onAdd(item.name)
                          onClose()
                        }}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// SlotSelector Component
// ============================================================================

interface SlotSelectorProps {
  slotType: ViktraniumSlotType
  selectedOption: CraftingOption | null
  craftingData: import('@/api/ddoGearPlanner').CraftingData | null
  isLegendary: boolean
  onChange: (option: CraftingOption | null) => void
}

/** Slot type color palette */
const SLOT_COLORS: Record<string, string> = {
  Melancholic: '#ff9800',
  Dolorous: '#f44336',
  Miserable: '#ab47bc',
  Woeful: '#78909c',
}

function getSlotColor(slotType: string): string {
  for (const [key, color] of Object.entries(SLOT_COLORS)) {
    if (slotType.startsWith(key)) return color
  }
  return '#78909c'
}

function SlotSelector({ slotType, selectedOption, craftingData, isLegendary, onChange }: SlotSelectorProps) {
  const options = useMemo(() => {
    if (!craftingData) return []
    return getAugmentOptions(slotType, craftingData, !isLegendary)
  }, [slotType, craftingData, isLegendary])

  const selectedName = selectedOption?.name ?? ''
  const isSelectionValid = options.some((o) => o.name === selectedName)
  const color = getSlotColor(slotType)

  return (
    <Box
      sx={{
        border: `1px solid`,
        borderColor: selectedOption ? color : 'divider',
        borderRadius: 1,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        transition: 'border-color 0.2s',
      }}
    >
      <Chip
        label={slotType}
        size="small"
        sx={{
          alignSelf: 'flex-start',
          bgcolor: color,
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '0.7rem',
        }}
      />

      {/* Augment selector */}
      <FormControl size="small" fullWidth>
        <InputLabel shrink>Augment</InputLabel>
        <Select
          value={isSelectionValid ? selectedName : ''}
          label="Augment"
          displayEmpty
          onChange={(e) => {
            const found = options.find((o) => o.name === e.target.value)
            onChange(found ?? null)
          }}
          sx={{ fontSize: '0.8rem' }}
        >
          <MenuItem value="">
            <em>None (skip this slot)</em>
          </MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.name} value={opt.name} sx={{ fontSize: '0.8rem' }}>
              <Box>
                <Typography variant="body2" fontSize="0.8rem">
                  {opt.name}
                </Typography>
                {(opt.affixes ?? []).length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {(opt.affixes ?? []).map(formatAffixPlain).join(', ')}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

    </Box>
  )
}
