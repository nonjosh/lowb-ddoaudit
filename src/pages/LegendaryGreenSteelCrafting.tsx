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
import { useMemo } from 'react'

import IngredientProgressList from '@/components/shared/IngredientProgressList'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useTrove } from '@/contexts/useTrove'
import {
  getEffectByName,
  GREEN_STEEL_ACCESSORY_TYPES,
  GREEN_STEEL_EFFECTS,
  GREEN_STEEL_WEAPON_TYPES,
  GreenSteelItemType,
  GreenSteelTier,
  GreenSteelTierSelection,
  INGREDIENTS_PER_TIER,
} from '@/domains/crafting/greenSteelLogic'
import {
  calculateLgsIngredients,
  getLgsCraftingSteps,
  getLgsWeaponBonusEffect,
} from '@/domains/crafting/lgsLogic'
import { useCraftingStorage } from '@/hooks/useCraftingStorage'
// ============================================================================

interface PlannedLgsItem {
  id: string
  itemType: GreenSteelItemType
  itemSubType: string
  tierSelections: GreenSteelTierSelection[]
}

const EMPTY_TIER_SELECTIONS: GreenSteelTierSelection[] = [
  { tier: 1, effectName: null },
  { tier: 2, effectName: null },
  { tier: 3, effectName: null },
]

const STORAGE_KEY = 'crafting-lgs-planned-items'

// ============================================================================
// Main Component
// ============================================================================

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
    return calculateLgsIngredients(allSelections)
  }, [plannedItems])

  const hasIngredients = Object.values(ingredientSummary).some((v) => v > 0)

  const subTypeOptions = newItemType === 'Weapon' ? GREEN_STEEL_WEAPON_TYPES : GREEN_STEEL_ACCESSORY_TYPES

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header */}
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
          Plan your Legendary Green Steel item upgrades across Tier 1, 2, and 3. Each tier requires{' '}
          {INGREDIENTS_PER_TIER} legendary ingredients + 1 energy cell.
        </Typography>
        <Alert severity="info" sx={{ mt: 1 }} icon={false}>
          <Typography variant="caption">
            Crafted with Legendary ingredients from Legendary The Shroud. Each tier uses
            Small/Medium/Large ingredient sizes with Low/Medium/High Energy Cells.
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

      {/* Ingredient Summary */}
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

// ============================================================================
// LgsItemCard Component
// ============================================================================

interface LgsItemCardProps {
  planned: PlannedLgsItem
  onRemove: () => void
  onUpdateTier: (
    tier: GreenSteelTier,
    updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>,
  ) => void
}

function LgsItemCard({ planned, onRemove, onUpdateTier }: LgsItemCardProps) {
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
    return getLgsWeaponBonusEffect(planned.tierSelections)
  }, [planned.itemType, planned.tierSelections])

  // Crafting steps (Focus/Essence/Gem per tier)
  const craftingSteps = useMemo(
    () => getLgsCraftingSteps(planned.tierSelections),
    [planned.tierSelections],
  )

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip label={planned.itemType} size="small" variant="outlined" />
        <Typography variant="subtitle2" fontWeight="bold">
          Legendary Green Steel {planned.itemSubType}
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
          <LgsTierSelectionPanel
            key={ts.tier}
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
              <Typography variant="caption">{step.essence}</Typography>
              <Typography variant="caption" color="text.secondary">+</Typography>
              <Typography variant="caption">{step.gem}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

// ============================================================================
// LgsTierSelectionPanel Component
// ============================================================================

interface LgsTierSelectionPanelProps {
  selection: GreenSteelTierSelection
  onUpdate: (updates: Partial<Omit<GreenSteelTierSelection, 'tier'>>) => void
}

const TIER_COLORS: Record<GreenSteelTier, string> = {
  1: '#4caf50',
  2: '#2196f3',
  3: '#9c27b0',
}

const TIER_LABELS: Record<GreenSteelTier, string> = {
  1: 'Tier 1 — Small / Low Energy Cell',
  2: 'Tier 2 — Medium / Medium Energy Cell',
  3: 'Tier 3 — Large / High Energy Cell',
}

const EFFECT_CATEGORIES = ['Spell Power', 'Lore', 'Resistance', 'Stat', 'Weapon Bonus'] as const

const lgsEffects = GREEN_STEEL_EFFECTS.filter((e) => !e.gsOnly)

function LgsTierSelectionPanel({ selection, onUpdate }: LgsTierSelectionPanelProps) {
  const color = TIER_COLORS[selection.tier]
  const selectedEffect = selection.effectName ? getEffectByName(selection.effectName) : null

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
        <InputLabel shrink>Effect</InputLabel>
        <Select
          value={selection.effectName ?? ''}
          label="Effect"
          displayEmpty
          onChange={(e) => onUpdate({ effectName: e.target.value || null })}
        >
          <MenuItem value="">
            <em>None (skip this tier)</em>
          </MenuItem>
          {EFFECT_CATEGORIES.flatMap((cat) => {
            const catEffects = lgsEffects.filter((e) => e.category === cat)
            return [
              <MenuItem key={`__category__${cat}`} disabled sx={{ fontWeight: 'bold', opacity: 0.7, fontSize: '0.75rem' }}>
                — {cat} —
              </MenuItem>,
              ...catEffects.map((eff) => (
                <MenuItem key={eff.name} value={eff.name}>
                  <Box>
                    <Typography variant="body2" fontSize="0.85rem">{eff.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{eff.description}</Typography>
                  </Box>
                </MenuItem>
              )),
            ]
          })}
        </Select>
      </FormControl>

      {selectedEffect && (
        <Typography variant="caption" color="text.secondary">
          {selectedEffect.element} element
        </Typography>
      )}
    </Box>
  )
}
