import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import {
  Alert,
  Box,
  Chip,
  Container,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { TroveItemLocation } from '@/api/trove/types'
import { useTrove } from '@/contexts/useTrove'
import {
  calculateGreenSteelIngredients,
  EssenceType,
  GemType,
  GREEN_STEEL_ACCESSORY_TYPES,
  GREEN_STEEL_ELEMENTS,
  GREEN_STEEL_WEAPON_TYPES,
  GreenSteelElement,
  GreenSteelItemType,
  GreenSteelTier,
  GreenSteelTierSelection,
  getTierLabel,
} from '@/domains/crafting/greenSteelLogic'

// ============================================================================
// Types
// ============================================================================

interface PlannedGreenSteelItem {
  id: string
  itemType: GreenSteelItemType
  itemSubType: string
  tierSelections: GreenSteelTierSelection[]
}

const EMPTY_TIER_SELECTIONS: GreenSteelTierSelection[] = [
  { tier: 1, element: null, essenceType: 'Ethereal', gemType: 'Dominion' },
  { tier: 2, element: null, essenceType: 'Ethereal', gemType: 'Dominion' },
  { tier: 3, element: null, essenceType: 'Ethereal', gemType: 'Dominion' },
]

// ============================================================================
// Main Component
// ============================================================================

export default function GreenSteelCrafting() {
  const { inventoryMap, importedAt } = useTrove()
  const [plannedItems, setPlannedItems] = useState<PlannedGreenSteelItem[]>([])
  const [newItemType, setNewItemType] = useState<GreenSteelItemType>('Weapon')
  const [newItemSubType, setNewItemSubType] = useState<string>('Long Sword')

  // Add item
  const addItem = () => {
    const id = `${newItemSubType}-${Date.now()}`
    setPlannedItems((prev) => [
      ...prev,
      {
        id,
        itemType: newItemType,
        itemSubType: newItemSubType,
        tierSelections: EMPTY_TIER_SELECTIONS.map((t) => ({ ...t })),
      },
    ])
  }

  // Remove item
  const removeItem = (id: string) => {
    setPlannedItems((prev) => prev.filter((p) => p.id !== id))
  }

  // Update a tier selection for an item
  const updateTierSelection = (
    itemId: string,
    tier: GreenSteelTier,
    updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>,
  ) => {
    setPlannedItems((prev) =>
      prev.map((p) => {
        if (p.id !== itemId) return p
        return {
          ...p,
          tierSelections: p.tierSelections.map((ts) =>
            ts.tier === tier ? { ...ts, ...updates } : ts,
          ),
        }
      }),
    )
  }

  // Aggregate ingredient summary across all planned items
  const ingredientSummary = useMemo(() => {
    const allSelections = plannedItems.flatMap((p) => p.tierSelections)
    return calculateGreenSteelIngredients(allSelections)
  }, [plannedItems])

  const hasIngredients = Object.values(ingredientSummary).some((v) => v > 0)

  // Subtype options based on selected type
  const subTypeOptions = newItemType === 'Weapon' ? GREEN_STEEL_WEAPON_TYPES : GREEN_STEEL_ACCESSORY_TYPES

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Green Steel Crafting</Typography>
          <Tooltip title="Based on: ddowiki.com/page/Green_Steel_items">
            <HelpOutlineIcon fontSize="small" color="action" />
          </Tooltip>
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
          Plan your Green Steel item upgrades across Tier 1, 2, and 3. Each tier requires 3 essences
          + 3 gems + 1 energy cell.
        </Typography>
        <Alert severity="info" sx={{ mt: 1 }} icon={false}>
          <Typography variant="caption">
            Crafted at The Shroud raid altars (Altar of Invasion T1, Altar of Subjugation T2,
            Altar of Devastation T3). Tier 1 uses Diluted/Cloudy, Tier 2 Distilled/Pristine,
            Tier 3 Pure/Flawless ingredients.
          </Typography>
        </Alert>
      </Paper>

      {/* Add Item Panel */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Add Item to Plan
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Item Type</InputLabel>
            <Select
              value={newItemType}
              label="Item Type"
              onChange={(e) => {
                const t = e.target.value as GreenSteelItemType
                setNewItemType(t)
                setNewItemSubType(
                  t === 'Weapon' ? GREEN_STEEL_WEAPON_TYPES[0] : GREEN_STEEL_ACCESSORY_TYPES[0],
                )
              }}
            >
              <MenuItem value="Weapon">Weapon</MenuItem>
              <MenuItem value="Accessory">Accessory</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sub Type</InputLabel>
            <Select
              value={newItemSubType}
              label="Sub Type"
              onChange={(e) => setNewItemSubType(e.target.value)}
            >
              {subTypeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            component="button"
            onClick={addItem}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 2,
              py: 0.75,
              border: '1px solid',
              borderColor: 'primary.main',
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              cursor: 'pointer',
              fontSize: '0.875rem',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <AddIcon fontSize="small" />
            Add
          </Box>
        </Box>
      </Paper>

      {/* Planned Items */}
      {plannedItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Planned Items
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plannedItems.map((planned) => (
              <PlannedItemCard
                key={planned.id}
                planned={planned}
                onRemove={() => removeItem(planned.id)}
                onUpdateTier={(tier, updates) => updateTierSelection(planned.id, tier, updates)}
              />
            ))}
          </Box>
        </Paper>
      )}

      {plannedItems.length === 0 && (
        <Paper sx={{ p: 4, mb: 2, textAlign: 'center' }}>
          <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Add a Green Steel item above to start planning your tier upgrades.
          </Typography>
        </Paper>
      )}

      {/* Ingredient Summary */}
      {hasIngredients && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Ingredient Summary
          </Typography>
          <GreenSteelIngredientTable
            summary={ingredientSummary}
            inventoryMap={inventoryMap}
          />
        </Paper>
      )}
    </Container>
  )
}

// ============================================================================
// PlannedItemCard Component
// ============================================================================

interface PlannedItemCardProps {
  planned: PlannedGreenSteelItem
  onRemove: () => void
  onUpdateTier: (
    tier: GreenSteelTier,
    updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>,
  ) => void
}

function PlannedItemCard({ planned, onRemove, onUpdateTier }: PlannedItemCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip label={planned.itemType} size="small" variant="outlined" />
        <Typography variant="subtitle2" fontWeight="bold">
          Green Steel {planned.itemSubType}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onRemove} title="Remove item">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {planned.tierSelections.map((ts) => (
          <TierSelectionPanel
            key={ts.tier}
            selection={ts}
            onUpdate={(updates) => onUpdateTier(ts.tier, updates)}
          />
        ))}
      </Box>
    </Paper>
  )
}

// ============================================================================
// TierSelectionPanel Component
// ============================================================================

interface TierSelectionPanelProps {
  selection: GreenSteelTierSelection
  onUpdate: (updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>) => void
}

const TIER_COLORS: Record<GreenSteelTier, string> = {
  1: '#4caf50',
  2: '#2196f3',
  3: '#9c27b0',
}

const TIER_LABELS: Record<GreenSteelTier, string> = {
  1: 'Tier 1 — Altar of Invasion (Diluted/Cloudy)',
  2: 'Tier 2 — Altar of Subjugation (Distilled/Pristine)',
  3: 'Tier 3 — Altar of Devastation (Pure/Flawless)',
}

function TierSelectionPanel({ selection, onUpdate }: TierSelectionPanelProps) {
  const color = TIER_COLORS[selection.tier]
  return (
    <Box
      sx={{
        border: `1px solid ${color}`,
        borderRadius: 1,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Typography variant="caption" fontWeight="bold" sx={{ color }}>
        {TIER_LABELS[selection.tier]}
      </Typography>

      {/* Element selector */}
      <FormControl size="small" fullWidth>
        <InputLabel>Element</InputLabel>
        <Select
          value={selection.element ?? ''}
          label="Element"
          onChange={(e) =>
            onUpdate({ element: (e.target.value as GreenSteelElement) || null })
          }
        >
          <MenuItem value="">
            <em>None (skip this tier)</em>
          </MenuItem>
          {GREEN_STEEL_ELEMENTS.map((el) => (
            <MenuItem key={el} value={el}>
              {el}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Essence type selector */}
      <FormControl size="small" fullWidth disabled={!selection.element}>
        <InputLabel>Essence</InputLabel>
        <Select
          value={selection.essenceType}
          label="Essence"
          onChange={(e) => onUpdate({ essenceType: e.target.value as EssenceType })}
        >
          <MenuItem value="Ethereal">Ethereal</MenuItem>
          <MenuItem value="Material">Material</MenuItem>
        </Select>
      </FormControl>

      {/* Gem type selector */}
      <FormControl size="small" fullWidth disabled={!selection.element}>
        <InputLabel>Gem</InputLabel>
        <Select
          value={selection.gemType}
          label="Gem"
          onChange={(e) => onUpdate({ gemType: e.target.value as GemType })}
        >
          <MenuItem value="Opposition">Opposition</MenuItem>
          <MenuItem value="Dominion">Dominion</MenuItem>
          <MenuItem value="Escalation">Escalation</MenuItem>
        </Select>
      </FormControl>

      {/* Summary of selected effect */}
      {selection.element && (
        <Typography variant="caption" color="text.secondary">
          {getTierLabel(selection)}
        </Typography>
      )}
    </Box>
  )
}

// ============================================================================
// GreenSteelIngredientTable Component
// ============================================================================

interface GreenSteelIngredientTableProps {
  summary: Record<string, number>
  inventoryMap: Map<string, TroveItemLocation[]>
}

function GreenSteelIngredientTable({ summary, inventoryMap }: GreenSteelIngredientTableProps) {
  const hasTrove = inventoryMap.size > 0

  const rows = Object.entries(summary)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ingredient, required]) => {
      const locations = inventoryMap.get(ingredient) ?? []
      const available = locations.reduce(
        (sum, loc) => sum + (loc.quantity ?? 0),
        0,
      )
      return { ingredient, required, available }
    })

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ingredient</TableCell>
            <TableCell align="right">Required</TableCell>
            {hasTrove && (
              <>
                <TableCell align="right">In Inventory</TableCell>
                <TableCell align="right">Status</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ ingredient, required, available }) => {
            const sufficient = !hasTrove || available >= required
            return (
              <TableRow key={ingredient}>
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
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
