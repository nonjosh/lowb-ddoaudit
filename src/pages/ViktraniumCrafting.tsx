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
import type { TroveItemLocation } from '@/api/trove/types'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import {
  ALL_VIKTRANIUM_INGREDIENTS,
  calculateViktraniumIngredients,
  getAugmentOptions,
  getViktraniumSlots,
  hasViktraniumSlots,
  LEGENDARY_ML_THRESHOLD,
  ViktraniumSlotType,
} from '@/domains/crafting/viktraniumLogic'
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

// ============================================================================
// Main Component
// ============================================================================

export default function ViktraniumCrafting() {
  const { items, craftingData, loading, refresh, error } = useGearPlanner()
  const { inventoryMap, importedAt } = useTrove()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([])

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
        .map((s) => s.selectedOption as CraftingOption),
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
          Plan your Viktranium augment slots and calculate required ingredients (5× each per augment).
          Items with ML ≤ {LEGENDARY_ML_THRESHOLD} use Heroic ingredients; higher ML uses Legendary.
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {planned.itemName}
                    </Typography>
                    {item && (
                      <Chip label={`ML ${item.ml}`} size="small" variant="outlined" />
                    )}
                    {item && (
                      <Chip label={item.slot} size="small" variant="outlined" color="primary" />
                    )}
                    <Chip
                      label={isLegendary ? 'Legendary' : 'Heroic'}
                      size="small"
                      color={isLegendary ? 'warning' : 'default'}
                      variant="filled"
                    />
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => removeItem(planned.id)} title="Remove item">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each augment slot costs 5× of each ingredient (heroic or legendary).
          </Typography>
          <IngredientTable
            summary={ingredientSummary}
            inventoryMap={inventoryMap}
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

function ViktraniumItemDialog({ open, onClose, items, onAdd }: ViktraniumItemDialogProps) {
  const [search, setSearch] = useState('')
  const [slotFilter, setSlotFilter] = useState('')

  const slots = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => s.add(i.slot))
    return [...s].sort()
  }, [items])

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return items.filter((i) => {
      const matchName = !search || i.name.toLowerCase().includes(lower)
      const matchSlot = !slotFilter || i.slot === slotFilter
      return matchName && matchSlot
    })
  }, [items, search, slotFilter])

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
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Slot</InputLabel>
            <Select
              value={slotFilter}
              label="Slot"
              onChange={(e) => setSlotFilter(e.target.value)}
            >
              <MenuItem value="">All slots</MenuItem>
              {slots.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ML</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Slot</TableCell>
                <TableCell>Crafting Slots</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.name} hover>
                  <TableCell>{item.ml}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.slot}</TableCell>
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
              ))}
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

function SlotSelector({ slotType, selectedOption, craftingData, isLegendary, onChange }: SlotSelectorProps) {
  const options = useMemo(() => {
    if (!craftingData) return []
    return getAugmentOptions(slotType, craftingData, !isLegendary)
  }, [slotType, craftingData, isLegendary])

  const selectedName = selectedOption?.name ?? ''
  const isSelectionValid = options.some((o) => o.name === selectedName)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Chip
          label={slotType}
          size="small"
          color={isLegendary ? 'warning' : 'default'}
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>

      {/* Augment selector */}
      <FormControl size="small" fullWidth>
        <InputLabel shrink>Augment</InputLabel>
        <Select
          value={isSelectionValid ? selectedName : ''}
          label="Augment"
          displayEmpty
          notched
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

// ============================================================================
// IngredientTable Component
// ============================================================================

interface IngredientTableProps {
  summary: Record<string, number>
  inventoryMap: Map<string, TroveItemLocation[]>
}

function IngredientTable({ summary, inventoryMap }: IngredientTableProps) {
  const rows = useMemo(() => {
    return ALL_VIKTRANIUM_INGREDIENTS.filter((ingredient) => summary[ingredient] > 0).map((ingredient) => {
      const required = summary[ingredient]
      const locations = inventoryMap.get(ingredient) ?? []
      const available = locations.reduce((sum, loc) => sum + (loc.quantity ?? 0), 0)
      const hasTrove = inventoryMap.size > 0
      return { ingredient, required, available, hasTrove }
    })
  }, [summary, inventoryMap])

  const heroicRows = rows.filter((r) => !r.ingredient.startsWith('Legendary'))
  const legendaryRows = rows.filter((r) => r.ingredient.startsWith('Legendary'))

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ingredient</TableCell>
            <TableCell align="right">Required</TableCell>
            {rows.some((r) => r.hasTrove) && (
              <>
                <TableCell align="right">In Inventory</TableCell>
                <TableCell align="right">Status</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {heroicRows.length > 0 && (
            <>
              <TableRow>
                <TableCell
                  colSpan={rows.some((r) => r.hasTrove) ? 4 : 2}
                  sx={{ bgcolor: 'action.hover', fontWeight: 'bold' }}
                >
                  Heroic Ingredients (ML 8)
                </TableCell>
              </TableRow>
              {heroicRows.map((row) => (
                <IngredientRow key={row.ingredient} {...row} />
              ))}
            </>
          )}
          {legendaryRows.length > 0 && (
            <>
              <TableRow>
                <TableCell
                  colSpan={rows.some((r) => r.hasTrove) ? 4 : 2}
                  sx={{ bgcolor: 'action.hover', fontWeight: 'bold' }}
                >
                  Legendary Ingredients (ML 34)
                </TableCell>
              </TableRow>
              {legendaryRows.map((row) => (
                <IngredientRow key={row.ingredient} {...row} />
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ============================================================================
// IngredientRow Component
// ============================================================================

interface IngredientRowProps {
  ingredient: string
  required: number
  available: number
  hasTrove: boolean
}

function IngredientRow({ ingredient, required, available, hasTrove }: IngredientRowProps) {
  const sufficient = available >= required

  return (
    <TableRow>
      <TableCell>{ingredient}</TableCell>
      <TableCell align="right">
        <Typography fontWeight="bold">{required}</Typography>
      </TableCell>
      {hasTrove && (
        <>
          <TableCell align="right">{available}</TableCell>
          <TableCell align="right">
            {sufficient ? (
              <Chip label="OK" color="success" size="small" />
            ) : (
              <Chip label={`Need ${required - available} more`} color="warning" size="small" />
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  )
}
