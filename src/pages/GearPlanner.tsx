import { useCallback, useEffect, useMemo, useState } from 'react'

import InventoryIcon from '@mui/icons-material/Inventory2'
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tooltip,
  Typography
} from '@mui/material'

import GearDisplay from '@/components/gearPlanner/GearDisplay'
import GearSuggestions from '@/components/gearPlanner/GearSuggestions'
import PropertySelector from '@/components/gearPlanner/PropertySelector'
import SummaryTable from '@/components/gearPlanner/SummaryTable'
import TroveImportDialog from '@/components/gearPlanner/TroveImportDialog'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import { calculateScore, getAllAvailableProperties, optimizeGear, OptimizedGearSetup, GearSetup } from '@/domains/gearPlanner'
import { Item } from '@/api/ddoGearPlanner'

const SELECTED_PROPERTIES_KEY = 'gearPlanner_selectedProperties'
const SELECTED_SETS_KEY = 'gearPlanner_selectedSets'
const SELECTED_INDEX_KEY = 'gearPlanner_selectedIndex'
const MAX_ML_KEY = 'gearPlanner_maxML'
const ARMOR_TYPE_KEY = 'gearPlanner_armorType'
const EXCLUDE_SET_AUGMENTS_KEY = 'gearPlanner_excludeSetAugments'
const MUST_INCLUDE_ARTIFACT_KEY = 'gearPlanner_mustIncludeArtifact'
const PINNED_SLOTS_KEY = 'gearPlanner_pinnedSlots'
const AUTO_OPTIMIZE_KEY = 'gearPlanner_autoOptimize'

// Type for hovering on a specific bonus source (property + bonus type cell)
interface HoveredBonusSource {
  property: string
  bonusType: string
  augmentNames?: string[]
}

function loadSelectedProperties(): string[] {
  try {
    const stored = localStorage.getItem(SELECTED_PROPERTIES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every(p => typeof p === 'string')) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveSelectedProperties(properties: string[]): void {
  try {
    localStorage.setItem(SELECTED_PROPERTIES_KEY, JSON.stringify(properties))
  } catch {
    // Ignore storage errors
  }
}

function loadSelectedSets(): string[] {
  try {
    const stored = localStorage.getItem(SELECTED_SETS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string')) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveSelectedSets(sets: string[]): void {
  try {
    localStorage.setItem(SELECTED_SETS_KEY, JSON.stringify(sets))
  } catch {
    // Ignore storage errors
  }
}

function loadSelectedIndex(): number {
  try {
    const stored = localStorage.getItem(SELECTED_INDEX_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 0
}

function saveSelectedIndex(index: number): void {
  try {
    localStorage.setItem(SELECTED_INDEX_KEY, String(index))
  } catch {
    // Ignore storage errors
  }
}

function loadMaxML(): number {
  try {
    const stored = localStorage.getItem(MAX_ML_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 40) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 34 // Default to level 34
}

function saveMaxML(maxML: number): void {
  try {
    localStorage.setItem(MAX_ML_KEY, String(maxML))
  } catch {
    // Ignore storage errors
  }
}

function loadArmorType(): string {
  try {
    const stored = localStorage.getItem(ARMOR_TYPE_KEY)
    if (stored) {
      return stored
    }
  } catch {
    // Ignore storage errors
  }
  return 'Any'
}

function saveArmorType(armorType: string): void {
  try {
    localStorage.setItem(ARMOR_TYPE_KEY, armorType)
  } catch {
    // Ignore storage errors
  }
}

function loadExcludeSetAugments(): boolean {
  try {
    const stored = localStorage.getItem(EXCLUDE_SET_AUGMENTS_KEY)
    if (stored) {
      return stored === 'true'
    }
  } catch {
    // Ignore storage errors
  }
  return false
}

function saveExcludeSetAugments(exclude: boolean): void {
  try {
    localStorage.setItem(EXCLUDE_SET_AUGMENTS_KEY, String(exclude))
  } catch {
    // Ignore storage errors
  }
}

function loadMustIncludeArtifact(): boolean {
  try {
    const stored = localStorage.getItem(MUST_INCLUDE_ARTIFACT_KEY)
    if (stored) {
      return stored === 'true'
    }
  } catch {
    // Ignore storage errors
  }
  return false
}

function saveMustIncludeArtifact(mustInclude: boolean): void {
  try {
    localStorage.setItem(MUST_INCLUDE_ARTIFACT_KEY, String(mustInclude))
  } catch {
    // Ignore storage errors
  }
}

function loadPinnedSlots(): Set<string> {
  try {
    const stored = localStorage.getItem(PINNED_SLOTS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(s => typeof s === 'string'))
      }
    }
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

function savePinnedSlots(pinnedSlots: Set<string>): void {
  try {
    localStorage.setItem(PINNED_SLOTS_KEY, JSON.stringify(Array.from(pinnedSlots)))
  } catch {
    // Ignore storage errors
  }
}

function loadAutoOptimize(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_OPTIMIZE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }
  } catch {
    // Ignore parse errors
  }
  return true // Default to auto-optimize enabled
}

function saveAutoOptimize(autoOptimize: boolean): void {
  try {
    localStorage.setItem(AUTO_OPTIMIZE_KEY, String(autoOptimize))
  } catch {
    // Ignore storage errors
  }
}

export default function GearPlanner() {
  const { items, setsData, craftingData, loading, error, refresh } = useGearPlanner()
  const { inventoryMap, isItemAvailableForCharacters, characters, selectedCharacterId, setSelectedCharacter, getEquippedItems } = useTrove()
  const [selectedProperties, setSelectedProperties] = useState<string[]>(loadSelectedProperties)
  const [selectedSets, setSelectedSets] = useState<string[]>(loadSelectedSets)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(loadSelectedIndex)
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  const [hoveredAugment, setHoveredAugment] = useState<string | null>(null)
  const [hoveredSetAugment, setHoveredSetAugment] = useState<string | null>(null)
  const [hoveredBonusSource, setHoveredBonusSource] = useState<HoveredBonusSource | null>(null)
  const [troveDialogOpen, setTroveDialogOpen] = useState(false)
  const [availableItemsOnly, setAvailableItemsOnly] = useState(false)
  const [includeRandomLoots] = useState(false)
  const [manualSetup, setManualSetup] = useState<OptimizedGearSetup | null>(null)
  const [maxML, setMaxML] = useState(loadMaxML)
  const [armorType, setArmorType] = useState(loadArmorType)
  const [excludeSetAugments, setExcludeSetAugments] = useState(loadExcludeSetAugments)
  const [mustIncludeArtifact, setMustIncludeArtifact] = useState(loadMustIncludeArtifact)
  const [hoveredSetName, setHoveredSetName] = useState<string | null>(null)
  const [pinnedSlots, setPinnedSlots] = useState<Set<string>>(loadPinnedSlots)
  const [pinnedItems, setPinnedItems] = useState<GearSetup>({})
  const [autoOptimize, setAutoOptimize] = useState(loadAutoOptimize)
  const [optimizationKey, setOptimizationKey] = useState(0)

  // Load data on mount if not already loaded
  useEffect(() => {
    if (items.length === 0 && !loading && !error) {
      void refresh(false)
    }
  }, [items.length, loading, error, refresh])

  // Get available properties from items
  const availableProperties = useMemo(() => {
    if (items.length === 0) return []
    return getAllAvailableProperties(items)
  }, [items])

  // Get available sets from setsData
  const availableSets = useMemo(() => {
    if (!setsData) return []
    return Object.keys(setsData).sort()
  }, [setsData])

  // Handle pin/unpin slot
  const handleTogglePin = useCallback((slot: string, currentSetup: GearSetup) => {
    setPinnedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slot)) {
        newSet.delete(slot)
        // Remove from pinned items
        setPinnedItems(prevItems => {
          const newItems = { ...prevItems }
          delete newItems[slot as keyof GearSetup]
          return newItems
        })
      } else {
        newSet.add(slot)
        // Add current item to pinned items
        const item = currentSetup[slot as keyof GearSetup]
        if (item) {
          setPinnedItems(prevItems => ({
            ...prevItems,
            [slot]: item
          }))
        }
      }
      savePinnedSlots(newSet)
      return newSet
    })
    // Don't clear manual setup - pinned items should stay
    // Trigger re-optimization if auto-optimize is enabled
    if (autoOptimize) {
      setOptimizationKey(k => k + 1)
    }
  }, [autoOptimize])

  // Handle manual refresh button click
  const handleManualRefresh = useCallback(() => {
    setOptimizationKey(k => k + 1)
  }, [])

  // Handle property selection change with persistence
  const handlePropertiesChange = (properties: string[]) => {
    setSelectedProperties(properties)
    saveSelectedProperties(properties)
    // Reset to first suggestion when properties change
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
    // Clear manual setup when properties change
    setManualSetup(null)
  }

  // Handle set effects selection change with persistence
  const handleSetsChange = (sets: string[]) => {
    setSelectedSets(sets)
    saveSelectedSets(sets)
    // Reset to first suggestion when sets change
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
    // Clear manual setup when sets change
    setManualSetup(null)
  }

  // Handle adding a new property from gear display
  const handlePropertyAdd = useCallback((property: string) => {
    if (!selectedProperties.includes(property)) {
      const newProperties = [...selectedProperties, property]
      setSelectedProperties(newProperties)
      saveSelectedProperties(newProperties)
      // Reset to first suggestion when properties change
      setSelectedSuggestionIndex(0)
      saveSelectedIndex(0)
      // Clear manual setup when properties change
      setManualSetup(null)
    }
  }, [selectedProperties])

  // Handle suggestion selection change with persistence
  const handleSuggestionSelect = (index: number) => {
    setSelectedSuggestionIndex(index)
    saveSelectedIndex(index)
    // Clear manual setup when selecting from suggestions
    setManualSetup(null)
  }

  // Handle loading equipped gear from a character
  const handleLoadEquipped = useCallback((characterId: number) => {
    const equippedItemNames = getEquippedItems(characterId)

    // Find items in the items list
    const itemsByName = new Map(items.map(item => [item.name, item]))
    const setup: GearSetup = {}

    // Try to map equipped items to gear slots
    for (const itemName of equippedItemNames) {
      const item = itemsByName.get(itemName)
      if (item && item.slot) {
        const slotKey = item.slot.toLowerCase()
        if (slotKey === 'ring') {
          if (!setup.ring1) setup.ring1 = item
          else if (!setup.ring2) setup.ring2 = item
        } else if (slotKey === 'armor') {
          setup.armor = item
        } else if (slotKey === 'belt') {
          setup.belt = item
        } else if (slotKey === 'boots') {
          setup.boots = item
        } else if (slotKey === 'bracers') {
          setup.bracers = item
        } else if (slotKey === 'cloak') {
          setup.cloak = item
        } else if (slotKey === 'gloves') {
          setup.gloves = item
        } else if (slotKey === 'goggles') {
          setup.goggles = item
        } else if (slotKey === 'helm') {
          setup.helm = item
        } else if (slotKey === 'necklace') {
          setup.necklace = item
        } else if (slotKey === 'trinket') {
          setup.trinket = item
        }
      }
    }

    // Calculate score with empty properties (just to have valid data)
    const result = calculateScore(setup, selectedProperties, setsData, craftingData, excludeSetAugments)

    setManualSetup({
      setup,
      score: result.score,
      propertyValues: result.propertyValues,
      unusedAugments: result.unusedAugments,
      totalAugments: result.totalAugments,
      extraProperties: result.extraProperties,
      otherEffects: result.otherEffects,
      activeSets: result.activeSets,
      craftingSelections: result.craftingSelections
    })

    // Reset property selection index since we're showing manual setup
    setSelectedSuggestionIndex(0)
  }, [getEquippedItems, items, selectedProperties, setsData, craftingData, excludeSetAugments])

  // Optimize gear when properties change
  const optimizedSetups = useMemo(() => {
    if (selectedProperties.length < 3 || items.length === 0) return []

    // Build pinned gear setup from pinnedItems state
    let pinnedGearSetup: GearSetup | undefined = undefined
    if (pinnedSlots.size > 0 && Object.keys(pinnedItems).length > 0) {
      pinnedGearSetup = { ...pinnedItems }
    }

    // Create item filter for available items mode
    const itemFilter =
      availableItemsOnly && inventoryMap.size > 0
        ? (item: { name: string }) => isItemAvailableForCharacters(item.name)
        : undefined

    return optimizeGear(items, setsData, {
      properties: selectedProperties,
      maxResults: 20,
      craftingData,
      itemFilter,
      maxML,
      armorType,
      excludeSetAugments,
      mustIncludeArtifact,
      pinnedGear: pinnedGearSetup
    })
    // optimizationKey is intentionally included to force re-optimization when manual refresh is clicked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, setsData, craftingData, selectedProperties, availableItemsOnly, inventoryMap, isItemAvailableForCharacters, maxML, armorType, excludeSetAugments, mustIncludeArtifact, pinnedSlots, pinnedItems, optimizationKey])

  // Handle manual gear change
  const handleGearChange = useCallback((slot: string, item: Item | undefined) => {
    // Get the current setup (from manual setup or selected suggestion)
    const currentSetup = manualSetup || optimizedSetups[Math.min(selectedSuggestionIndex, optimizedSetups.length - 1)]
    if (!currentSetup) return

    const newSetup: GearSetup = { ...currentSetup.setup }
    newSetup[slot as keyof GearSetup] = item

    // Recalculate score
    const result = calculateScore(newSetup, selectedProperties, setsData, craftingData, excludeSetAugments)

    setManualSetup({
      setup: newSetup,
      score: result.score,
      propertyValues: result.propertyValues,
      unusedAugments: result.unusedAugments,
      totalAugments: result.totalAugments,
      extraProperties: result.extraProperties,
      otherEffects: result.otherEffects,
      activeSets: result.activeSets,
      craftingSelections: result.craftingSelections
    })
  }, [manualSetup, optimizedSetups, selectedSuggestionIndex, selectedProperties, setsData, craftingData, excludeSetAugments])

  // Keep selection in bounds when suggestions change
  const effectiveIndex = useMemo(() => {
    if (optimizedSetups.length === 0) return 0
    return Math.min(selectedSuggestionIndex, optimizedSetups.length - 1)
  }, [optimizedSetups.length, selectedSuggestionIndex])

  const selectedSetup = manualSetup || optimizedSetups[effectiveIndex]

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Failed to load gear data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {error || 'No items available'}
          </Typography>
          <Button variant="contained" onClick={() => refresh(true)}>
            Retry
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gear Planner
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Select properties to optimize and find the best gear combinations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Badge
            badgeContent={inventoryMap.size > 0 ? '✓' : undefined}
            color="success"
            overlap="circular"
          >
            <Button
              variant="outlined"
              startIcon={<InventoryIcon />}
              onClick={() => setTroveDialogOpen(true)}
              size="small"
            >
              Import Trove Data
            </Button>
          </Badge>
          {inventoryMap.size > 0 && (
            <>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Character</InputLabel>
                <Select
                  value={selectedCharacterId !== null ? String(selectedCharacterId) : ''}
                  label="Character"
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedCharacter(val === '' ? null : Number(val))
                  }}
                >
                  <MenuItem value="">All Characters</MenuItem>
                  {characters.map((char) => (
                    <MenuItem key={char.id} value={String(char.id)}>
                      {char.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Only show gear setups using items you own">
                <FormControlLabel
                  control={
                    <Switch
                      checked={availableItemsOnly}
                      onChange={(e) => setAvailableItemsOnly(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Available items only"
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
              </Tooltip>
              <Tooltip title="Coming soon...">
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeRandomLoots}
                      disabled
                      size="small"
                    />
                  }
                  label="Include random loots"
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Trove Import Dialog */}
      <TroveImportDialog
        open={troveDialogOpen}
        onClose={() => setTroveDialogOpen(false)}
      />

      {/* Section 1: Property Selector */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <PropertySelector
          availableProperties={availableProperties}
          selectedProperties={selectedProperties}
          onChange={handlePropertiesChange}
          availableSets={availableSets}
          selectedSets={selectedSets}
          onSetsChange={handleSetsChange}
        />
      </Paper>

      {/* Optimization Filters */}
      {selectedProperties.length >= 3 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">
              Optimization Filters
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoOptimize}
                    onChange={(e) => {
                      const newValue = e.target.checked
                      setAutoOptimize(newValue)
                      saveAutoOptimize(newValue)
                    }}
                    size="small"
                  />
                }
                label="Auto-refresh"
                labelPlacement="start"
                sx={{ m: 0 }}
              />
              <Box sx={{ width: 90, display: 'flex', justifyContent: 'flex-end' }}>
                {!autoOptimize && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleManualRefresh}
                  >
                    Refresh
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Max Item Level</InputLabel>
              <Select
                value={maxML}
                label="Max Item Level"
                onChange={(e) => {
                  const newMaxML = Number(e.target.value)
                  setMaxML(newMaxML)
                  saveMaxML(newMaxML)
                }}
              >
                {Array.from({ length: 34 }, (_, i) => 34 - i).map(level => (
                  <MenuItem key={level} value={level}>
                    Level {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Armor Type</InputLabel>
              <Select
                value={armorType}
                label="Armor Type"
                onChange={(e) => {
                  const newArmorType = e.target.value
                  setArmorType(newArmorType)
                  saveArmorType(newArmorType)
                }}
              >
                <MenuItem value="Any">Any</MenuItem>
                <MenuItem value="Cloth">Cloth</MenuItem>
                <MenuItem value="Light">Light</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Heavy">Heavy</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={excludeSetAugments}
                  onChange={(e) => {
                    const newValue = e.target.checked
                    setExcludeSetAugments(newValue)
                    saveExcludeSetAugments(newValue)
                  }}
                  size="small"
                />
              }
              label="Exclude Set Augments"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={mustIncludeArtifact}
                  onChange={(e) => {
                    const newValue = e.target.checked
                    setMustIncludeArtifact(newValue)
                    saveMustIncludeArtifact(newValue)
                  }}
                  size="small"
                />
              }
              label="Must Include Minor Artifact"
            />
          </Box>
        </Paper>
      )}

      {/* Show message if less than 3 properties selected */}
      {selectedProperties.length > 0 && selectedProperties.length < 3 && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="body1" color="text.secondary">
            Please select at least 3 properties to generate gear suggestions
          </Typography>
        </Paper>
      )}

      {/* Show results if 3+ properties selected */}
      {selectedProperties.length >= 3 && optimizedSetups.length > 0 && selectedSetup && (
        <>
          {/* Section 3: Gear Suggestions (moved to top) */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <GearSuggestions
              suggestions={optimizedSetups}
              selectedIndex={effectiveIndex}
              onSelect={handleSuggestionSelect}
              selectedProperties={selectedProperties}
            />
          </Paper>

          {/* Section 2: Selected Gear Display */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <GearDisplay
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              hoveredProperty={hoveredProperty}
              hoveredAugment={hoveredAugment}
              hoveredSetAugment={hoveredSetAugment}
              hoveredBonusSource={hoveredBonusSource}
              hoveredSetName={hoveredSetName}
              onAugmentHover={setHoveredAugment}
              onSetAugmentHover={setHoveredSetAugment}
              onSetNameHover={setHoveredSetName}
              craftingSelections={selectedSetup.craftingSelections}
              setsData={setsData}
              onLoadEquipped={handleLoadEquipped}
              onGearChange={handleGearChange}
              availableItems={items}
              onPropertyAdd={handlePropertyAdd}
              pinnedSlots={pinnedSlots}
              onTogglePin={handleTogglePin}
            />
          </Paper>

          {/* Section 4: Summary Table */}
          <Paper elevation={2}>
            <SummaryTable
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              setsData={setsData}
              onPropertyHover={setHoveredProperty}
              onBonusSourceHover={setHoveredBonusSource}
              hoveredAugment={hoveredAugment}
              hoveredSetName={hoveredSetName}
              craftingSelections={selectedSetup.craftingSelections}
            />
          </Paper>
        </>
      )}

      {/* Show message if no results found */}
      {selectedProperties.length >= 3 && optimizedSetups.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="body1" color="text.secondary">
            No gear combinations found for the selected properties
          </Typography>
        </Paper>
      )}
    </Container>
  )
}
