import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
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
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'

import IngredientProgressList from '@/components/shared/IngredientProgressList'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useTrove } from '@/contexts/useTrove'
import {
  calculateGreenSteelIngredients,
  getEffectByName,
  getGreenSteelIngredientSummaryForSelection,
  getGsCraftingSteps,
  getGsWeaponBonusEffect,
  GREEN_STEEL_ACCESSORY_TYPES,
  GREEN_STEEL_EFFECTS,
  GREEN_STEEL_WEAPON_TYPES,
  GreenSteelItemType,
  GreenSteelTier,
  GreenSteelTierSelection,
  INGREDIENTS_PER_TIER,
} from '@/domains/crafting/greenSteelLogic'
import { useCraftingStorage } from '@/hooks/useCraftingStorage'
// ============================================================================

interface PlannedGreenSteelItem {
  id: string
  itemType: GreenSteelItemType
  itemSubType: string
  tierSelections: GreenSteelTierSelection[]
}

interface GreenSteelIngredientPreview {
  itemId: string
  selection: GreenSteelTierSelection
}

const EMPTY_TIER_SELECTIONS: GreenSteelTierSelection[] = [
  { tier: 1, effectName: null },
  { tier: 2, effectName: null },
  { tier: 3, effectName: null },
]

const STORAGE_KEY = 'crafting-gs-planned-items'

function replaceTierSelection(
  items: PlannedGreenSteelItem[],
  itemId: string,
  nextSelection: GreenSteelTierSelection,
): PlannedGreenSteelItem[] {
  return items.map((plannedItem) => {
    if (plannedItem.id !== itemId) {
      return plannedItem
    }

    return {
      ...plannedItem,
      tierSelections: plannedItem.tierSelections.map((selection) =>
        selection.tier === nextSelection.tier ? nextSelection : selection,
      ),
    }
  })
}

// ============================================================================
// Main Component
// ============================================================================

export default function GreenSteelCrafting() {
  const { inventoryMap, importedAt } = useTrove()
  const [hoveredSelection, setHoveredSelection] = useState<{
    itemId: string
    tier: GreenSteelTier
  } | null>(null)
  const [previewSelection, setPreviewSelection] = useState<GreenSteelIngredientPreview | null>(null)
  const [plannedItems, setPlannedItems] = useCraftingStorage<PlannedGreenSteelItem[]>(
    STORAGE_KEY,
    [],
  )
  const [newItemType, setNewItemType] = useCraftingStorage<GreenSteelItemType>(
    'crafting-gs-new-item-type',
    'Weapon',
  )
  const [newItemSubType, setNewItemSubType] = useCraftingStorage<string>(
    'crafting-gs-new-item-subtype',
    'Long Sword',
  )

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

  const removeItem = (id: string) => {
    setPlannedItems((prev) => prev.filter((p) => p.id !== id))
  }

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

  const ingredientSummary = useMemo(() => {
    const allSelections = plannedItems.flatMap((p) => p.tierSelections)
    return calculateGreenSteelIngredients(allSelections)
  }, [plannedItems])
  const displayedIngredientSummary = useMemo(() => {
    if (!previewSelection) {
      return ingredientSummary
    }

    return calculateGreenSteelIngredients(
      replaceTierSelection(plannedItems, previewSelection.itemId, previewSelection.selection).flatMap(
        (plannedItem) => plannedItem.tierSelections,
      ),
    )
  }, [ingredientSummary, plannedItems, previewSelection])
  const inventoryCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const [ingredient, locations] of inventoryMap.entries()) {
      counts.set(
        ingredient,
        locations.reduce((sum, location) => sum + (location.quantity ?? 0), 0),
      )
    }

    return counts
  }, [inventoryMap])
  const highlightedIngredients = useMemo(() => {
    if (previewSelection) {
      return Object.keys(getGreenSteelIngredientSummaryForSelection(previewSelection.selection))
    }

    if (!hoveredSelection) {
      return []
    }

    const plannedItem = plannedItems.find((item) => item.id === hoveredSelection.itemId)
    const selection = plannedItem?.tierSelections.find((tier) => tier.tier === hoveredSelection.tier)

    if (!selection) {
      return []
    }

    return Object.keys(getGreenSteelIngredientSummaryForSelection(selection))
  }, [hoveredSelection, plannedItems, previewSelection])

  const hasIngredients = Object.values(ingredientSummary).some((v) => v > 0)

  const subTypeOptions = newItemType === 'Weapon' ? GREEN_STEEL_WEAPON_TYPES : GREEN_STEEL_ACCESSORY_TYPES

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Green Steel Crafting</Typography>
          <DdoWikiLink wikiUrl="https://ddowiki.com/page/Green_Steel_item_crafting_steps" />
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
          Plan your Green Steel item upgrades across Tier 1, 2, and 3. Each tier requires{' '}
          {INGREDIENTS_PER_TIER} essences + {INGREDIENTS_PER_TIER} gems + 1 energy cell.
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
                allPlannedItems={plannedItems}
                inventoryCounts={inventoryCounts}
                planned={planned}
                onHoverSelectionChange={(tier) =>
                  setHoveredSelection(tier ? { itemId: planned.id, tier } : null)
                }
                onPreviewSelectionChange={setPreviewSelection}
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
          <IngredientProgressList
            summary={displayedIngredientSummary}
            highlightedIngredients={highlightedIngredients}
            inventoryMap={inventoryMap}
            sortAlphabetically
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
  allPlannedItems: PlannedGreenSteelItem[]
  inventoryCounts: Map<string, number>
  planned: PlannedGreenSteelItem
  onHoverSelectionChange: (tier: GreenSteelTier | null) => void
  onPreviewSelectionChange: (preview: GreenSteelIngredientPreview | null) => void
  onRemove: () => void
  onUpdateTier: (
    tier: GreenSteelTier,
    updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>,
  ) => void
}

function PlannedItemCard({
  allPlannedItems,
  inventoryCounts,
  planned,
  onHoverSelectionChange,
  onPreviewSelectionChange,
  onRemove,
  onUpdateTier,
}: PlannedItemCardProps) {
  const effects = planned.tierSelections
    .map((ts) => (ts.effectName ? getEffectByName(ts.effectName) : null))
    .filter(Boolean)
  let comboInfo: string | null = null
  if (effects.length > 0) {
    const elements = effects.map((e) => e!.element)
    const uniqueElements = [...new Set(elements)]
    if (uniqueElements.length === 1 && elements.length === 3) {
      comboInfo = `Pure ${uniqueElements[0]} build`
    } else {
      const tierLabels = planned.tierSelections
        .map((ts, i) => {
          const eff = ts.effectName ? getEffectByName(ts.effectName) : null
          return eff ? `T${i + 1}: ${eff.element}` : null
        })
        .filter(Boolean)
      comboInfo = tierLabels.join(', ')
    }
  }

  // Weapon bonus effect (only for weapons with all 3 tiers filled)
  const weaponBonus = useMemo(() => {
    if (planned.itemType !== 'Weapon') return null
    return getGsWeaponBonusEffect(planned.tierSelections)
  }, [planned.itemType, planned.tierSelections])

  // Crafting steps (Focus/Essence/Gem per tier)
  const craftingSteps = useMemo(
    () => getGsCraftingSteps(planned.tierSelections),
    [planned.tierSelections],
  )

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip label={planned.itemType} size="small" variant="outlined" />
        <Typography variant="subtitle2" fontWeight="bold">
          Green Steel {planned.itemSubType}
        </Typography>
        {comboInfo && (
          <Chip label={comboInfo} size="small" color="info" variant="outlined" />
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onRemove} title="Remove item">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 1.5,
        }}
      >
        {planned.tierSelections.map((ts) => (
          <TierSelectionPanel
            key={ts.tier}
            allPlannedItems={allPlannedItems}
            inventoryCounts={inventoryCounts}
            itemId={planned.id}
            onHoverChange={onHoverSelectionChange}
            onPreviewChange={onPreviewSelectionChange}
            selection={ts}
            onUpdate={(updates) => onUpdateTier(ts.tier, updates)}
          />
        ))}
      </Box>

      {/* Weapon Bonus Effect */}
      {planned.itemType === 'Weapon' && weaponBonus && (
        <Alert severity="info" icon={false} sx={{ mt: 1.5, py: 0.5 }}>
          <Typography variant="body2" fontWeight="bold">
            ⚔️ Weapon Bonus: {weaponBonus.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {weaponBonus.description}
          </Typography>
        </Alert>
      )}

      {/* Crafting Recipe Summary */}
      {craftingSteps.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Crafting Recipe (Focus / Essence / Gem)
          </Typography>
          {craftingSteps.map((step) => (
            <Box
              key={step.tier}
              sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap',
                alignItems: 'center',
                py: 0.25,
              }}
            >
              <Chip
                label={`T${step.tier}`}
                size="small"
                sx={{
                  bgcolor: TIER_COLORS[step.tier],
                  color: '#fff',
                  fontWeight: 'bold',
                  height: 20,
                  '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
                }}
              />
              <Typography variant="caption">{step.focus}</Typography>
              <Typography variant="caption" color="text.secondary">+</Typography>
              <Typography variant="caption">{step.essence} ×{INGREDIENTS_PER_TIER}</Typography>
              <Typography variant="caption" color="text.secondary">+</Typography>
              <Typography variant="caption">{step.gem} ×{INGREDIENTS_PER_TIER}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

// ============================================================================
// TierSelectionPanel Component
// ============================================================================

interface TierSelectionPanelProps {
  allPlannedItems: PlannedGreenSteelItem[]
  inventoryCounts: Map<string, number>
  itemId: string
  onHoverChange: (tier: GreenSteelTier | null) => void
  onPreviewChange: (preview: GreenSteelIngredientPreview | null) => void
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

const EFFECT_CATEGORIES = ['Spell Power', 'Lore', 'Resistance', 'Stat', 'Weapon Bonus'] as const

const gsEffects = GREEN_STEEL_EFFECTS.filter((e) => !e.lgsOnly)

function TierSelectionPanel({
  allPlannedItems,
  inventoryCounts,
  itemId,
  onHoverChange,
  onPreviewChange,
  selection,
  onUpdate,
}: TierSelectionPanelProps) {
  const color = TIER_COLORS[selection.tier]
  const selectedEffect = selection.effectName ? getEffectByName(selection.effectName) : null
  const hasTrove = inventoryCounts.size > 0
  const reservedIngredientSummary = useMemo(
    () =>
      calculateGreenSteelIngredients(
        replaceTierSelection(allPlannedItems, itemId, { ...selection, effectName: null }).flatMap(
          (plannedItem) => plannedItem.tierSelections,
        ),
      ),
    [allPlannedItems, itemId, selection],
  )

  const clearPreview = () => onPreviewChange(null)

  const showPreview = (candidateSelection: GreenSteelTierSelection) => {
    onPreviewChange({ itemId, selection: candidateSelection })
  }

  const getAvailabilityColor = (candidateSelection: GreenSteelTierSelection) => {
    if (!hasTrove || !candidateSelection.effectName) {
      return undefined
    }

    const candidateSummary = getGreenSteelIngredientSummaryForSelection(candidateSelection)
    const hasEnoughIngredients = Object.entries(candidateSummary).every(([ingredient, required]) => {
      const available = inventoryCounts.get(ingredient) ?? 0
      const reserved = reservedIngredientSummary[ingredient] ?? 0
      return available - reserved >= required
    })

    return hasEnoughIngredients ? 'success.main' : 'error.main'
  }

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

      <Box
        onMouseEnter={() => onHoverChange(selection.effectName ? selection.tier : null)}
        onMouseLeave={() => onHoverChange(null)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel shrink>Effect</InputLabel>
          <Select
            value={selection.effectName ?? ''}
            label="Effect"
            displayEmpty
            onClose={clearPreview}
            MenuProps={{
              MenuListProps: {
                onMouseLeave: clearPreview,
              },
            }}
            onChange={(e) => {
              clearPreview()
              onUpdate({ effectName: e.target.value || null })
            }}
          >
            <MenuItem
              value=""
              onFocus={() => showPreview({ ...selection, effectName: null })}
              onMouseEnter={() => showPreview({ ...selection, effectName: null })}
            >
              <em>None (skip this tier)</em>
            </MenuItem>
            {EFFECT_CATEGORIES.flatMap((cat) => {
              const catEffects = gsEffects.filter((e) => e.category === cat)
              return [
                <MenuItem
                  key={`__category__${cat}`}
                  disabled
                  sx={{ fontWeight: 'bold', opacity: 0.7, fontSize: '0.75rem' }}
                >
                  — {cat} —
                </MenuItem>,
                ...catEffects.map((eff) => {
                  const candidateSelection = { ...selection, effectName: eff.name }
                  const availabilityColor = getAvailabilityColor(candidateSelection)

                  return (
                    <MenuItem
                      key={eff.name}
                      value={eff.name}
                      onFocus={() => showPreview(candidateSelection)}
                      onMouseEnter={() => showPreview(candidateSelection)}
                      sx={availabilityColor ? { color: availabilityColor } : undefined}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          fontSize="0.85rem"
                          fontWeight={availabilityColor ? 600 : undefined}
                        >
                          {eff.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={availabilityColor ? 'inherit' : 'text.secondary'}
                          sx={availabilityColor ? { opacity: 0.85 } : undefined}
                        >
                          {eff.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                }),
              ]
            })}
          </Select>
        </FormControl>

        {selectedEffect && (
          <Typography variant="caption" color="text.secondary">
            {selectedEffect.element} / {selectedEffect.essenceType} / {selectedEffect.gemType}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
