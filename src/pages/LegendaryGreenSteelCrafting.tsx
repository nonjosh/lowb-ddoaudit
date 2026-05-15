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
import { useEffect, useMemo } from 'react'

import IngredientProgressList from '@/components/shared/IngredientProgressList'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
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
  getLgsWeaponBonusEffect,
} from '@/domains/crafting/lgsLogic'
import { useCraftingStorage } from '@/hooks/useCraftingStorage'

interface PlannedLgsItem {
  id: string
  itemType: GreenSteelItemType
  itemSubType: string
  tierSelections: LgsTierSelection[]
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

export default function LegendaryGreenSteelCrafting() {
  const { inventoryMap, importedAt } = useTrove()
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
            summary={ingredientSummary}
            inventoryMap={inventoryMap}
            sortAlphabetically
          />
        </Paper>
      )}
    </Container>
  )
}

interface LgsItemCardProps {
  planned: PlannedLgsItem
  onRemove: () => void
  onUpdateTier: (
    tier: GreenSteelTier,
    updates: Partial<Omit<LgsTierSelection, 'tier'>>,
  ) => void
}

function LgsItemCard({ planned, onRemove, onUpdateTier }: LgsItemCardProps) {
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
            itemType={planned.itemType}
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
  itemType: GreenSteelItemType
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

function LgsTierSelectionPanel({ itemType, selection, onUpdate }: LgsTierSelectionPanelProps) {
  const color = TIER_COLORS[selection.tier]
  const categoryOrder = getLgsOptionCategories(itemType)
  const options = getLgsOptions(itemType, selection.tier)
  const selectedOption = selection.optionId ? getLgsOptionById(selection.optionId) : null
  const isTierThreeWeapon = itemType === 'Weapon' && selection.tier === 3

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

      <FormControl size="small" fullWidth>
        <InputLabel shrink>Augment</InputLabel>
        <Select
          value={selection.optionId ?? ''}
          label="Augment"
          displayEmpty
          onChange={(event) => {
            const optionId = event.target.value || null
            const option = optionId ? getLgsOptionById(optionId) : null
            onUpdate({
              optionId,
              secondaryFocus:
                optionId && isTierThreeWeapon ? selection.secondaryFocus ?? option?.focus ?? null : null,
            })
          }}
        >
          <MenuItem value="">
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
              ...categoryOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  <Box>
                    <Typography variant="body2" fontSize="0.85rem">
                      {option.effectName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              )),
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
              onChange={(event) =>
                onUpdate({ secondaryFocus: event.target.value as GreenSteelElement })
              }
            >
              {LGS_FOCUS_OPTIONS.map((focus) => (
                <MenuItem key={focus} value={focus}>
                  {focus}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            Tier 3 weapon augments use a second superior focus. That extra focus changes both the raw
            ingredient cost and the final weapon bonus.
          </Typography>
        </>
      )}
    </Box>
  )
}
