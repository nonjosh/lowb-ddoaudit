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
import { useEffect, useMemo, useState } from 'react'

import DdoWikiLink from '@/components/shared/DdoWikiLink'
import IngredientProgressList from '@/components/shared/IngredientProgressList'
import { useTrove } from '@/contexts/useTrove'
import {
  getLgsOptionById,
  getLgsOptionCategories,
  getLgsOptions,
  getLgsSubTypeOptions,
  LGS_FOCUS_OPTIONS,
  LgsTierSelection,
  normalizeLgsItemSubType,
} from '@/domains/crafting/lgsData'
import type {
  GreenSteelElement,
  GreenSteelItemType,
  GreenSteelTier,
} from '@/domains/crafting/greenSteelLogic'
import {
  calculateLgsIngredients,
  getLgsCraftingSteps,
  getLgsIngredientSummaryForSelection,
  getLgsWeaponBonusEffect,
} from '@/domains/crafting/lgsLogic'
import { useCraftingStorage } from '@/hooks/useCraftingStorage'

interface PlannedLgsItem {
  id: string
  itemType: GreenSteelItemType
  itemSubType: string
  tierSelections: LgsTierSelection[]
}

interface LgsIngredientPreview {
  itemId: string
  itemType: GreenSteelItemType
  selection: LgsTierSelection
}

const EMPTY_TIER_SELECTIONS: LgsTierSelection[] = [
  { tier: 1, optionId: null, secondaryFocus: null },
  { tier: 2, optionId: null, secondaryFocus: null },
  { tier: 3, optionId: null, secondaryFocus: null },
]

const STORAGE_KEY = 'crafting-lgs-planned-items'

function normalizeSecondaryFocus(value: unknown): GreenSteelElement | null {
  if (typeof value !== 'string') {
    return null
  }

  return LGS_FOCUS_OPTIONS.some((focus) => focus === value)
    ? (value as GreenSteelElement)
    : null
}

function findStoredSelection(rawSelections: unknown[], tier: GreenSteelTier): unknown {
  return (
    rawSelections.find(
      (selection) =>
        selection &&
        typeof selection === 'object' &&
        (selection as { tier?: unknown }).tier === tier,
    ) ?? rawSelections[tier - 1]
  )
}

function normalizeStoredSelection(
  itemType: GreenSteelItemType,
  rawSelection: unknown,
  tier: GreenSteelTier,
): LgsTierSelection {
  const selectionRecord =
    rawSelection && typeof rawSelection === 'object'
      ? (rawSelection as Record<string, unknown>)
      : {}

  const rawOptionId =
    typeof selectionRecord.optionId === 'string'
      ? selectionRecord.optionId
      : typeof selectionRecord.effectName === 'string'
        ? selectionRecord.effectName
        : null

  const option = rawOptionId ? getLgsOptionById(rawOptionId) : undefined
  if (!option || option.itemType !== itemType || option.tier !== tier) {
    return { tier, optionId: null, secondaryFocus: null }
  }

  return {
    tier,
    optionId: option.id,
    secondaryFocus: option.requiresSecondaryFocus
      ? normalizeSecondaryFocus(selectionRecord.secondaryFocus) ?? option.focus
      : null,
  }
}

function normalizeStoredPlannedItems(items: PlannedLgsItem[]): PlannedLgsItem[] {
  return items.map((item, index) => {
    const itemRecord =
      item && typeof item === 'object' ? (item as unknown as Record<string, unknown>) : {}
    const itemType: GreenSteelItemType = itemRecord.itemType === 'Accessory' ? 'Accessory' : 'Weapon'
    const itemSubType = normalizeLgsItemSubType(
      itemType,
      typeof itemRecord.itemSubType === 'string'
        ? itemRecord.itemSubType
        : getLgsSubTypeOptions(itemType)[0],
    )
    const rawSelections = Array.isArray(itemRecord.tierSelections) ? itemRecord.tierSelections : []

    return {
      id: typeof itemRecord.id === 'string' ? itemRecord.id : `${itemSubType}-${index}`,
      itemType,
      itemSubType,
      tierSelections: [1, 2, 3].map((tier) =>
        normalizeStoredSelection(
          itemType,
          findStoredSelection(rawSelections, tier as GreenSteelTier),
          tier as GreenSteelTier,
        ),
      ),
    }
  })
}

function replaceTierSelection(
  items: PlannedLgsItem[],
  itemId: string,
  nextSelection: LgsTierSelection,
): PlannedLgsItem[] {
  return items.map((plannedItem) => {
    if (plannedItem.id !== itemId) {
      return plannedItem
    }

    return {
      ...plannedItem,
      tierSelections: plannedItem.tierSelections.map((plannedSelection) =>
        plannedSelection.tier === nextSelection.tier ? nextSelection : plannedSelection,
      ),
    }
  })
}

export default function LegendaryGreenSteelCrafting() {
  const { inventoryMap, importedAt } = useTrove()
  const [hoveredSelection, setHoveredSelection] = useState<{
    itemId: string
    tier: GreenSteelTier
  } | null>(null)
  const [previewSelection, setPreviewSelection] = useState<LgsIngredientPreview | null>(null)
  const [plannedItems, setPlannedItems] = useCraftingStorage<PlannedLgsItem[]>(
    STORAGE_KEY,
    [],
  )
  const [newItemType, setNewItemType] = useCraftingStorage<GreenSteelItemType>(
    'crafting-lgs-new-item-type',
    'Weapon',
  )
  const [newItemSubType, setNewItemSubType] = useCraftingStorage<string>(
    'crafting-lgs-new-item-subtype',
    'Longsword',
  )

  useEffect(() => {
    setPlannedItems((prev) => {
      const normalized = normalizeStoredPlannedItems(prev)
      return JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized
    })
  }, [setPlannedItems])

  useEffect(() => {
    setNewItemSubType((prev) => normalizeLgsItemSubType(newItemType, prev))
  }, [newItemType, setNewItemSubType])

  const addItem = () => {
    const itemSubType = normalizeLgsItemSubType(newItemType, newItemSubType)
    const id = `${itemSubType}-${Date.now()}`
    setPlannedItems((prev) => [
      ...prev,
      {
        id,
        itemType: newItemType,
        itemSubType,
        tierSelections: EMPTY_TIER_SELECTIONS.map((selection) => ({ ...selection })),
      },
    ])
  }

  const removeItem = (id: string) => {
    setPlannedItems((prev) => prev.filter((planned) => planned.id !== id))
  }

  const updateTierSelection = (
    itemId: string,
    tier: GreenSteelTier,
    updates: Partial<Omit<LgsTierSelection, 'tier'>>,
  ) => {
    setPlannedItems((prev) =>
      prev.map((planned) => {
        if (planned.id !== itemId) {
          return planned
        }

        return {
          ...planned,
          tierSelections: planned.tierSelections.map((selection) =>
            selection.tier === tier ? { ...selection, ...updates } : selection,
          ),
        }
      }),
    )
  }

  const ingredientSummary = useMemo(() => calculateLgsIngredients(plannedItems), [plannedItems])
  const displayedIngredientSummary = useMemo(() => {
    if (!previewSelection) {
      return ingredientSummary
    }

    return calculateLgsIngredients(
      replaceTierSelection(plannedItems, previewSelection.itemId, previewSelection.selection),
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
      return Object.keys(
        getLgsIngredientSummaryForSelection(previewSelection.itemType, previewSelection.selection),
      )
    }

    if (!hoveredSelection) {
      return []
    }

    const planned = plannedItems.find((item) => item.id === hoveredSelection.itemId)
    const selection = planned?.tierSelections.find((tier) => tier.tier === hoveredSelection.tier)

    if (!planned || !selection) {
      return []
    }

    return Object.keys(getLgsIngredientSummaryForSelection(planned.itemType, selection))
  }, [hoveredSelection, plannedItems, previewSelection])
  const hasIngredients = Object.values(ingredientSummary).some((value) => value > 0)
  const subTypeOptions = getLgsSubTypeOptions(newItemType)

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Legendary Green Steel Crafting</Typography>
          <DdoWikiLink wikiUrl="https://ddowiki.com/page/Legendary_Green_Steel_items" />
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
          Plan the core Legendary Green Steel Tier 1, 2, and 3 augments using the actual wiki recipe
          tables for weapons and accessories.
        </Typography>
        <Alert severity="info" sx={{ mt: 1 }} icon={false}>
          <Typography variant="caption">
            Accessories share one augment pool regardless of blank. Tier 3 weapons use a double-shard
            recipe with a second superior focus. Active augments and the Fangs of Shavarath cleanse slot
            are not modeled here yet.
          </Typography>
        </Alert>
      </Paper>

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
              onChange={(event) => {
                const itemType = event.target.value as GreenSteelItemType
                setNewItemType(itemType)
                setNewItemSubType(getLgsSubTypeOptions(itemType)[0])
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
              onChange={(event) => setNewItemSubType(event.target.value)}
            >
              {subTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
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

      {plannedItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Planned Items
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plannedItems.map((planned) => (
              <LgsItemCard
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
            Add a Legendary Green Steel item above to start planning your tier upgrades.
          </Typography>
        </Paper>
      )}

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

interface LgsItemCardProps {
  allPlannedItems: PlannedLgsItem[]
  inventoryCounts: Map<string, number>
  planned: PlannedLgsItem
  onHoverSelectionChange: (tier: GreenSteelTier | null) => void
  onPreviewSelectionChange: (preview: LgsIngredientPreview | null) => void
  onRemove: () => void
  onUpdateTier: (
    tier: GreenSteelTier,
    updates: Partial<Omit<LgsTierSelection, 'tier'>>,
  ) => void
}

function LgsItemCard({
  allPlannedItems,
  inventoryCounts,
  planned,
  onHoverSelectionChange,
  onPreviewSelectionChange,
  onRemove,
  onUpdateTier,
}: LgsItemCardProps) {
  const focusSummary = planned.tierSelections
    .flatMap((selection) => {
      if (!selection.optionId) {
        return []
      }

      const option = getLgsOptionById(selection.optionId)
      if (!option) {
        return []
      }

      const secondaryFocus =
        planned.itemType === 'Weapon' && selection.tier === 3 && selection.secondaryFocus
          ? ` + ${selection.secondaryFocus}`
          : ''

      return [`T${selection.tier}: ${option.focus}${secondaryFocus}`]
    })
    .join(', ')

  const weaponBonus = useMemo(() => {
    if (planned.itemType !== 'Weapon') {
      return null
    }

    return getLgsWeaponBonusEffect(planned.tierSelections)
  }, [planned.itemType, planned.tierSelections])

  const craftingSteps = useMemo(
    () => getLgsCraftingSteps(planned.itemType, planned.tierSelections),
    [planned.itemType, planned.tierSelections],
  )

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip label={planned.itemType} size="small" variant="outlined" />
        <Typography variant="subtitle2" fontWeight="bold">
          Legendary Green Steel {planned.itemSubType}
        </Typography>
        {focusSummary && (
          <Chip label={focusSummary} size="small" color="info" variant="outlined" />
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
        {planned.tierSelections.map((selection) => (
          <LgsTierSelectionPanel
            key={selection.tier}
            allPlannedItems={allPlannedItems}
            inventoryCounts={inventoryCounts}
            itemId={planned.id}
            itemType={planned.itemType}
            onHoverChange={onHoverSelectionChange}
            onPreviewChange={onPreviewSelectionChange}
            selection={selection}
            onUpdate={(updates) => onUpdateTier(selection.tier, updates)}
          />
        ))}
      </Box>

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

      {craftingSteps.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography
            variant="caption"
            fontWeight="bold"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
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
              {step.secondaryFocus && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    +
                  </Typography>
                  <Typography variant="caption">{step.secondaryFocus}</Typography>
                </>
              )}
              <Typography variant="caption" color="text.secondary">
                +
              </Typography>
              <Typography variant="caption">{step.essence}</Typography>
              <Typography variant="caption" color="text.secondary">
                +
              </Typography>
              <Typography variant="caption">{step.gem}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

interface LgsTierSelectionPanelProps {
  allPlannedItems: PlannedLgsItem[]
  inventoryCounts: Map<string, number>
  itemId: string
  itemType: GreenSteelItemType
  onHoverChange: (tier: GreenSteelTier | null) => void
  onPreviewChange: (preview: LgsIngredientPreview | null) => void
  selection: LgsTierSelection
  onUpdate: (updates: Partial<Omit<LgsTierSelection, 'tier'>>) => void
}

const TIER_COLORS: Record<GreenSteelTier, string> = {
  1: '#4caf50',
  2: '#2196f3',
  3: '#9c27b0',
}

const TIER_LABELS: Record<GreenSteelTier, string> = {
  1: 'Tier 1 — Invasion (Inferior / Diluted / Cloudy)',
  2: 'Tier 2 — Subjugation (Focus / Essence / Gem)',
  3: 'Tier 3 — Devastation (Superior / Pure / Flawless)',
}

function LgsTierSelectionPanel({
  allPlannedItems,
  inventoryCounts,
  itemId,
  itemType,
  onHoverChange,
  onPreviewChange,
  selection,
  onUpdate,
}: LgsTierSelectionPanelProps) {
  const color = TIER_COLORS[selection.tier]
  const categoryOrder = getLgsOptionCategories(itemType)
  const options = getLgsOptions(itemType, selection.tier)
  const selectedOption = selection.optionId ? getLgsOptionById(selection.optionId) : null
  const isTierThreeWeapon = itemType === 'Weapon' && selection.tier === 3
  const hasTrove = inventoryCounts.size > 0
  const reservedIngredientSummary = useMemo(
    () =>
      calculateLgsIngredients(
        replaceTierSelection(allPlannedItems, itemId, {
          ...selection,
          optionId: null,
          secondaryFocus: null,
        }),
      ),
    [allPlannedItems, itemId, selection],
  )

  const clearPreview = () => onPreviewChange(null)

  const showPreview = (candidateSelection: LgsTierSelection) => {
    onPreviewChange({
      itemId,
      itemType,
      selection: candidateSelection,
    })
  }

  const getAvailabilityColor = (candidateSelection: LgsTierSelection) => {
    if (!hasTrove || !candidateSelection.optionId) {
      return undefined
    }

    const candidateSummary = getLgsIngredientSummaryForSelection(itemType, candidateSelection)
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
        onMouseEnter={() => onHoverChange(selection.optionId ? selection.tier : null)}
        onMouseLeave={() => onHoverChange(null)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel shrink>Augment</InputLabel>
          <Select
            value={selection.optionId ?? ''}
            label="Augment"
            displayEmpty
            onClose={clearPreview}
            MenuProps={{
              MenuListProps: {
                onMouseLeave: clearPreview,
              },
            }}
            onChange={(event) => {
              const optionId = event.target.value || null
              const option = optionId ? getLgsOptionById(optionId) : null
              clearPreview()
              onUpdate({
                optionId,
                secondaryFocus:
                  optionId && isTierThreeWeapon ? selection.secondaryFocus ?? option?.focus ?? null : null,
              })
            }}
          >
            <MenuItem
              value=""
              onFocus={() =>
                showPreview({
                  ...selection,
                  optionId: null,
                  secondaryFocus: null,
                })
              }
              onMouseEnter={() =>
                showPreview({
                  ...selection,
                  optionId: null,
                  secondaryFocus: null,
                })
              }
            >
              <em>None (skip this tier)</em>
            </MenuItem>
            {categoryOrder.flatMap((category) => {
              const categoryOptions = options.filter((option) => option.category === category)
              if (categoryOptions.length === 0) {
                return []
              }

              return [
                <MenuItem
                  key={`__category__${category}`}
                  disabled
                  sx={{ fontWeight: 'bold', opacity: 0.7, fontSize: '0.75rem' }}
                >
                  — {category} —
                </MenuItem>,
                ...categoryOptions.map((option) => {
                  const candidateSelection = {
                    ...selection,
                    optionId: option.id,
                    secondaryFocus: option.requiresSecondaryFocus
                      ? selection.secondaryFocus ?? option.focus
                      : null,
                  }
                  const availabilityColor = getAvailabilityColor({
                    ...candidateSelection,
                  })

                  return (
                    <MenuItem
                      key={option.id}
                      value={option.id}
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
                          {option.effectName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={availabilityColor ? 'inherit' : 'text.secondary'}
                          sx={availabilityColor ? { opacity: 0.85 } : undefined}
                        >
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                }),
              ]
            })}
          </Select>
        </FormControl>

        {selectedOption && (
          <Typography variant="caption" color="text.secondary">
            {selectedOption.description}
          </Typography>
        )}

        {isTierThreeWeapon && selectedOption && (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel shrink>Secondary Tier 3 Focus</InputLabel>
              <Select
                value={selection.secondaryFocus ?? selectedOption.focus}
                label="Secondary Tier 3 Focus"
                onClose={clearPreview}
                MenuProps={{
                  MenuListProps: {
                    onMouseLeave: clearPreview,
                  },
                }}
                onChange={(event) => {
                  clearPreview()
                  onUpdate({ secondaryFocus: event.target.value as GreenSteelElement })
                }}
              >
                {LGS_FOCUS_OPTIONS.map((focus) => {
                  const candidateSelection = {
                    ...selection,
                    secondaryFocus: focus,
                  }
                  const availabilityColor = getAvailabilityColor({
                    ...candidateSelection,
                  })

                  return (
                    <MenuItem
                      key={focus}
                      value={focus}
                      onFocus={() => showPreview(candidateSelection)}
                      onMouseEnter={() => showPreview(candidateSelection)}
                      sx={availabilityColor ? { color: availabilityColor } : undefined}
                    >
                      <Typography fontWeight={availabilityColor ? 600 : undefined}>
                        {focus}
                      </Typography>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">
              Tier 3 weapon augments use a second superior focus. That extra focus changes both the raw
              ingredient cost and the final weapon bonus.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}
