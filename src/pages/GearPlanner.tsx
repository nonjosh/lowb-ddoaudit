import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import BlockIcon from '@mui/icons-material/Block'
import ShareIcon from '@mui/icons-material/Share'
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography
} from '@mui/material'

import { CraftingOption, Item } from '@/api/ddoGearPlanner'
import ExternalUrlDialog from '@/components/gearPlanner/ExternalUrlDialog'
import GearDisplay from '@/components/gearPlanner/GearDisplay'
import GearSetupTabs from '@/components/gearPlanner/GearSetupTabs'
import GearSuggestions from '@/components/gearPlanner/GearSuggestions'
import PropertyPresetSelector from '@/components/gearPlanner/PropertyPresetSelector'
import PropertySelector from '@/components/gearPlanner/PropertySelector'
import IgnoreListDialog from '@/components/gearPlanner/SettingsDialog'
import SummaryTable from '@/components/gearPlanner/SummaryTable'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import { buildPropertyBonusIndex, buildUpdatedCraftingSelections, EvaluatedGearSetup, evaluateGearSetup, getAllAvailableProperties, GearSetup, getTheoreticalMax, PropertyBonusIndex } from '@/domains/gearPlanner'
import { useGearSetups } from '@/hooks/useGearSetups'
import { usePropertyPresets } from '@/hooks/usePropertyPresets'

const SELECTED_PROPERTIES_KEY = 'gearPlanner_selectedProperties'
const SELECTED_SETS_KEY = 'gearPlanner_selectedSets'
const EXCLUDE_SET_AUGMENTS_KEY = 'gearPlanner_excludeSetAugments'
const PINNED_SLOTS_KEY = 'gearPlanner_pinnedSlots'
const EXCLUDED_PACKS_KEY = 'gearPlanner_excludedPacks'
const EXCLUDED_AUGMENTS_KEY = 'gearPlanner_excludedAugments'
const EXCLUDED_ITEMS_KEY = 'gearPlanner_excludedItems'

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

function loadExcludedPacks(): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_PACKS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveExcludedPacks(packs: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_PACKS_KEY, JSON.stringify(packs))
  } catch {
    // Ignore storage errors
  }
}

function loadExcludedAugments(): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_AUGMENTS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveExcludedAugments(augments: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_AUGMENTS_KEY, JSON.stringify(augments))
  } catch {
    // Ignore storage errors
  }
}

function loadExcludedItems(): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_ITEMS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveExcludedItems(items: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_ITEMS_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage errors
  }
}

export default function GearPlanner() {
  const { items, setsData, craftingData, loading, error, refresh } = useGearPlanner()
  const { inventoryMap, characters, selectedCharacterId, setSelectedCharacter, getEquippedItems, hiddenCharacterIds } = useTrove()
  const gearSetups = useGearSetups()
  const propertyPresets = usePropertyPresets()
  const [selectedProperties, setSelectedProperties] = useState<string[]>(loadSelectedProperties)
  const [selectedSets, setSelectedSets] = useState<string[]>(loadSelectedSets)
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  const [hoveredAugment, setHoveredAugment] = useState<string | null>(null)
  const [hoveredSetAugment, setHoveredSetAugment] = useState<string | null>(null)
  const [hoveredBonusSource, setHoveredBonusSource] = useState<HoveredBonusSource | null>(null)
  const [currentSetup, setCurrentSetup] = useState<EvaluatedGearSetup | null>(null)
  const [excludeSetAugments, setExcludeSetAugments] = useState(loadExcludeSetAugments)
  const [hoveredSetName, setHoveredSetName] = useState<string | null>(null)
  const [pinnedSlots, setPinnedSlots] = useState<Set<string>>(loadPinnedSlots)
  const [pinnedItems, setPinnedItems] = useState<GearSetup>({})
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [excludedPacks, setExcludedPacks] = useState<string[]>(loadExcludedPacks)
  const [excludedAugments, setExcludedAugments] = useState<string[]>(loadExcludedAugments)
  const [excludedItems, setExcludedItems] = useState<string[]>(loadExcludedItems)
  const [externalUrlDialogOpen, setExternalUrlDialogOpen] = useState(false)

  // Track whether initial setup has been loaded from DB
  const initialSetupLoadedRef = useRef(false)

  // Sort characters alphabetically by name and filter out hidden
  const sortedCharacters = useMemo(() => {
    return [...characters]
      .filter(char => !hiddenCharacterIds.includes(char.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [characters, hiddenCharacterIds])

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

  // Build property-bonus index (one-time when data loads)
  const propertyIndex: PropertyBonusIndex | null = useMemo(() => {
    if (items.length === 0) return null
    return buildPropertyBonusIndex(items, setsData, craftingData)
  }, [items, setsData, craftingData])

  // Compute theoretical max for each selected property
  const theoreticalMaxValues = useMemo(() => {
    const maxMap = new Map<string, number>()
    if (!propertyIndex) return maxMap
    for (const prop of selectedProperties) {
      maxMap.set(prop, getTheoreticalMax(propertyIndex, prop))
    }
    return maxMap
  }, [propertyIndex, selectedProperties])

  // Get available sets from setsData
  const availableSets = useMemo(() => {
    if (!setsData) return []
    return Object.keys(setsData).sort()
  }, [setsData])

  // Set of item names available in Trove inventory
  const ownedItemNames = useMemo(() => {
    return new Set(inventoryMap.keys())
  }, [inventoryMap])

  // Helper to evaluate a gear setup and build an EvaluatedGearSetup
  const buildEvaluatedSetup = useCallback((
    setup: GearSetup,
    properties: string[],
    existingCraftingSelections?: Parameters<typeof evaluateGearSetup>[7]
  ): EvaluatedGearSetup => {
    const result = evaluateGearSetup(
      setup, properties, setsData, craftingData, excludeSetAugments,
      excludedAugments, excludedPacks,
      existingCraftingSelections
    )
    return {
      setup,
      propertyValues: result.propertyValues,
      propertyBreakdowns: result.propertyBreakdowns,
      unusedAugments: result.unusedAugments,
      totalAugments: result.totalAugments,
      extraProperties: result.extraProperties,
      otherEffects: result.otherEffects,
      activeSets: result.activeSets,
      craftingSelections: existingCraftingSelections ?? result.craftingSelections
    }
  }, [setsData, craftingData, excludeSetAugments, excludedAugments, excludedPacks])

  // Helper: load a saved gear setup by ID and apply it to the current state
  const applyLoadedSetup = useCallback(async (id: number) => {
    if (items.length === 0) return
    const data = await gearSetups.loadSetupData(id, items, craftingData)
    if (data && Object.keys(data.setup).length > 0) {
      // Restore pinned state
      setPinnedSlots(data.pinnedSlots)
      savePinnedSlots(data.pinnedSlots)
      const newPinnedItems: GearSetup = {}
      data.pinnedSlots.forEach(slot => {
        const item = data.setup[slot as keyof GearSetup]
        if (item) newPinnedItems[slot as keyof GearSetup] = item
      })
      setPinnedItems(newPinnedItems)

      setCurrentSetup(buildEvaluatedSetup(data.setup, selectedProperties, data.craftingSelections))
    } else {
      // Empty setup
      setCurrentSetup(null)
      setPinnedSlots(new Set())
      savePinnedSlots(new Set())
      setPinnedItems({})
    }
  }, [items, craftingData, selectedProperties, buildEvaluatedSetup, gearSetups])

  // Load active gear setup from DB when items become available
  useEffect(() => {
    if (!gearSetups.isLoaded || items.length === 0 || !gearSetups.activeSetupId) return
    if (initialSetupLoadedRef.current) return
    initialSetupLoadedRef.current = true

    const loadInitial = async () => {
      const id = gearSetups.activeSetupId!
      const data = await gearSetups.loadSetupData(id, items, craftingData)
      if (data && Object.keys(data.setup).length > 0) {
        setPinnedSlots(data.pinnedSlots)
        savePinnedSlots(data.pinnedSlots)
        const newPinnedItems: GearSetup = {}
        data.pinnedSlots.forEach(slot => {
          const item = data.setup[slot as keyof GearSetup]
          if (item) newPinnedItems[slot as keyof GearSetup] = item
        })
        setPinnedItems(newPinnedItems)
        setCurrentSetup(buildEvaluatedSetup(data.setup, selectedProperties, data.craftingSelections))
      }
    }
    void loadInitial()
  }, [gearSetups.isLoaded, items.length, gearSetups.activeSetupId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle gear setup tab switch
  const handleSetupSelect = useCallback(async (id: number) => {
    gearSetups.selectSetup(id)
    await applyLoadedSetup(id)
  }, [gearSetups, applyLoadedSetup])

  // Handle creating a new gear setup tab
  const handleSetupAdd = useCallback(async () => {
    await gearSetups.createSetup()
    setCurrentSetup(null)
    setPinnedSlots(new Set())
    savePinnedSlots(new Set())
    setPinnedItems({})
  }, [gearSetups])

  // Auto-save helper: save current setup state to DB
  const autoSaveSetup = useCallback((
    setup: GearSetup,
    craftingSelections?: ReturnType<typeof evaluateGearSetup>['craftingSelections'],
    currentPinnedSlots?: Set<string>
  ) => {
    void gearSetups.saveCurrentSetup(setup, craftingSelections, currentPinnedSlots ?? pinnedSlots)
  }, [gearSetups, pinnedSlots])

  // Handle property preset selection
  const handlePresetSelect = useCallback((id: number) => {
    const preset = propertyPresets.presets.find(p => p.id === id)
    if (!preset) return

    propertyPresets.selectPreset(id)
    setSelectedProperties(preset.properties)
    saveSelectedProperties(preset.properties)
    setSelectedSets(preset.sets)
    saveSelectedSets(preset.sets)
  }, [propertyPresets])

  // Handle saving current properties as a new preset
  const handlePresetSave = useCallback((name: string) => {
    void propertyPresets.savePreset(name, selectedProperties, selectedSets)
  }, [propertyPresets, selectedProperties, selectedSets])

  // Handle updating an existing preset with current properties
  const handlePresetUpdate = useCallback((id: number) => {
    void propertyPresets.updatePreset(id, selectedProperties, selectedSets)
  }, [propertyPresets, selectedProperties, selectedSets])

  // Handle pin/unpin slot
  const handleTogglePin = useCallback((slot: string, setup: GearSetup) => {
    setPinnedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slot)) {
        newSet.delete(slot)
        setPinnedItems(prevItems => {
          const newItems = { ...prevItems }
          delete newItems[slot as keyof GearSetup]
          return newItems
        })
      } else {
        newSet.add(slot)
        const item = setup[slot as keyof GearSetup]
        if (item) {
          setPinnedItems(prevItems => ({
            ...prevItems,
            [slot]: item
          }))
        }
      }
      savePinnedSlots(newSet)
      autoSaveSetup(setup, undefined, newSet)
      return newSet
    })
  }, [autoSaveSetup])

  // Handle exclusion changes
  const handleExcludedPacksChange = useCallback((packs: string[]) => {
    setExcludedPacks(packs)
    saveExcludedPacks(packs)
  }, [])

  const handleExcludedAugmentsChange = useCallback((augments: string[]) => {
    setExcludedAugments(augments)
    saveExcludedAugments(augments)
  }, [])

  const handleExcludedItemsChange = useCallback((newItems: string[]) => {
    setExcludedItems(newItems)
    saveExcludedItems(newItems)
  }, [])

  const handleToggleItemIgnore = useCallback((itemName: string) => {
    setExcludedItems(prev => {
      const newList = prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
      saveExcludedItems(newList)
      return newList
    })
  }, [])

  // Handle property selection change with persistence
  const handlePropertiesChange = (properties: string[]) => {
    setSelectedProperties(properties)
    saveSelectedProperties(properties)
    propertyPresets.selectPreset(null)
  }

  // Handle set effects selection change with persistence
  const handleSetsChange = (sets: string[]) => {
    setSelectedSets(sets)
    saveSelectedSets(sets)
    propertyPresets.selectPreset(null)
  }

  // Handle adding a new property from gear display
  const handlePropertyAdd = useCallback((property: string) => {
    if (!selectedProperties.includes(property)) {
      const newProperties = [...selectedProperties, property]
      setSelectedProperties(newProperties)
      saveSelectedProperties(newProperties)
    }
  }, [selectedProperties])

  // Handle loading equipped gear from a character
  const handleLoadEquipped = useCallback((characterId: number) => {
    const equippedItemNames = getEquippedItems(characterId)

    const itemsByName = new Map(items.map(item => [item.name, item]))
    const setup: GearSetup = {}

    for (const itemName of equippedItemNames) {
      const item = itemsByName.get(itemName)
      if (item && item.slot) {
        const slotKey = item.slot.toLowerCase()
        if (slotKey === 'ring') {
          if (!setup.ring1) setup.ring1 = item
          else if (!setup.ring2) setup.ring2 = item
        } else if (slotKey === 'weapon') {
          setup.mainHand = item
        } else if (slotKey === 'offhand') {
          setup.offHand = item
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

    // Clear pins for slots that have different items than currently pinned
    const newPinnedSlots = new Set<string>()
    const newPinnedItems: GearSetup = {}
    pinnedSlots.forEach(slot => {
      const pinnedItem = pinnedItems[slot as keyof GearSetup]
      const loadedItem = setup[slot as keyof GearSetup]
      if (pinnedItem && loadedItem && pinnedItem.name === loadedItem.name) {
        newPinnedSlots.add(slot)
        newPinnedItems[slot as keyof GearSetup] = pinnedItem
      }
    })
    setPinnedSlots(newPinnedSlots)
    setPinnedItems(newPinnedItems)
    savePinnedSlots(newPinnedSlots)

    const evaluated = buildEvaluatedSetup(setup, selectedProperties)
    setCurrentSetup(evaluated)
    autoSaveSetup(setup, evaluated.craftingSelections, newPinnedSlots)
  }, [getEquippedItems, items, selectedProperties, pinnedSlots, pinnedItems, autoSaveSetup, buildEvaluatedSetup])

  // Handle importing a gear setup from an external ddo-gear-planner URL
  const handleExternalUrlImport = useCallback((importedSetup: EvaluatedGearSetup, trackedProperties?: string[]) => {
    if (trackedProperties && trackedProperties.length > 0 && selectedProperties.length === 0) {
      setSelectedProperties(trackedProperties)
      saveSelectedProperties(trackedProperties)
    }

    setPinnedSlots(new Set())
    setPinnedItems({})
    savePinnedSlots(new Set())

    setCurrentSetup(importedSetup)
    autoSaveSetup(importedSetup.setup, importedSetup.craftingSelections, new Set())
  }, [selectedProperties.length, autoSaveSetup])

  // Handle manual gear change
  const handleGearChange = useCallback((slot: string, item: Item | undefined) => {
    const newSetup: GearSetup = { ...(currentSetup?.setup ?? {}), [slot]: item }

    const evaluated = buildEvaluatedSetup(newSetup, selectedProperties)
    setCurrentSetup(evaluated)
    autoSaveSetup(newSetup, evaluated.craftingSelections)
  }, [currentSetup, selectedProperties, buildEvaluatedSetup, autoSaveSetup])

  // Handle applying a full setup from GearSuggestions
  const handleApplySetup = useCallback((setup: GearSetup) => {
    const evaluated = buildEvaluatedSetup(setup, selectedProperties)
    setCurrentSetup(evaluated)
    autoSaveSetup(setup, evaluated.craftingSelections)
  }, [selectedProperties, buildEvaluatedSetup, autoSaveSetup])

  // Handle manual crafting/augment change for a specific slot
  const handleCraftingChange = useCallback((gearSlot: string, slotIndex: number, option: CraftingOption | null) => {
    const setupToUse = currentSetup?.setup ?? {}
    const item = setupToUse[gearSlot as keyof GearSetup]
    const newCraftingSelections = buildUpdatedCraftingSelections(
      currentSetup?.craftingSelections ?? {},
      gearSlot,
      slotIndex,
      option,
      item?.crafting
    )

    const evaluated = buildEvaluatedSetup(setupToUse, selectedProperties, newCraftingSelections)
    setCurrentSetup(evaluated)
    autoSaveSetup(setupToUse, newCraftingSelections)
  }, [currentSetup, selectedProperties, buildEvaluatedSetup, autoSaveSetup])

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
      {/* Header: Title + Action Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ flexShrink: 0 }}>
          Gear Planner
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
          <Tooltip title="Import / Export gear setup from ddo-gear-planner">
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => setExternalUrlDialogOpen(true)}
              size="small"
            >
              Import / Export
            </Button>
          </Tooltip>
          <Tooltip title="Exclude items, augments, and adventure packs">
            <Badge
              badgeContent={excludedPacks.length + excludedAugments.length + excludedItems.length || undefined}
              color="error"
            >
              <Button
                variant="outlined"
                startIcon={<BlockIcon />}
                onClick={() => setSettingsDialogOpen(true)}
                size="small"
                color={excludedPacks.length + excludedAugments.length + excludedItems.length > 0 ? 'error' : 'inherit'}
              >
                Ignore List
              </Button>
            </Badge>
          </Tooltip>
        </Box>
      </Box>

      {/* Dialogs */}
      <ExternalUrlDialog
        open={externalUrlDialogOpen}
        onClose={() => setExternalUrlDialogOpen(false)}
        items={items}
        craftingData={craftingData}
        setsData={setsData}
        currentSetup={currentSetup?.setup}
        currentCraftingSelections={currentSetup?.craftingSelections}
        selectedProperties={selectedProperties}
        excludeSetAugments={excludeSetAugments}
        onImport={handleExternalUrlImport}
      />
      <IgnoreListDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        items={items}
        excludedPacks={excludedPacks}
        onExcludedPacksChange={handleExcludedPacksChange}
        excludedAugments={excludedAugments}
        onExcludedAugmentsChange={handleExcludedAugmentsChange}
        excludedItems={excludedItems}
        onExcludedItemsChange={handleExcludedItemsChange}
      />

      {/* Properties + Presets (presets inline with title) */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <PropertySelector
          availableProperties={availableProperties}
          selectedProperties={selectedProperties}
          onChange={handlePropertiesChange}
          availableSets={availableSets}
          selectedSets={selectedSets}
          onSetsChange={handleSetsChange}
          presetSlot={propertyPresets.isLoaded ? (
            <PropertyPresetSelector
              presets={propertyPresets.presets}
              activePresetId={propertyPresets.activePresetId}
              onSelect={handlePresetSelect}
              onSave={handlePresetSave}
              onUpdate={handlePresetUpdate}
              onRename={(id, name) => { void propertyPresets.renamePreset(id, name) }}
              onDelete={(id) => { void propertyPresets.deletePreset(id) }}
              hasProperties={selectedProperties.length > 0}
            />
          ) : undefined}
        />
      </Paper>

      {/* Gear Suggestions (right after properties) */}
      {currentSetup && selectedProperties.length > 0 && propertyIndex && (
        <Paper elevation={2} sx={{ mb: 3 }}>
          <GearSuggestions
            currentSetup={currentSetup}
            selectedProperties={selectedProperties}
            items={items}
            setsData={setsData}
            craftingData={craftingData}
            propertyIndex={propertyIndex}
            pinnedSlots={pinnedSlots}
            excludeSetAugments={excludeSetAugments}
            excludedAugments={excludedAugments}
            excludedPacks={excludedPacks}
            onApplySetup={handleApplySetup}
            ownedItemNames={ownedItemNames}
            onExcludeSetAugmentsChange={(exclude) => {
              setExcludeSetAugments(exclude)
              saveExcludeSetAugments(exclude)
            }}
          />
        </Paper>
      )}

      {/* Main Content: responsive horizontal/vertical layout */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', xl: 'row' },
          alignItems: 'flex-start',
        }}
      >
        {/* Left: Gear Display (with Gear Setup Tabs in header) */}
        <Paper elevation={2} sx={{ flex: { xl: '1 1 0%' }, minWidth: 0, width: { xs: '100%', xl: 'auto' } }}>
          <GearDisplay
            setup={currentSetup?.setup ?? {}}
            selectedProperties={selectedProperties}
            hoveredProperty={hoveredProperty}
            hoveredAugment={hoveredAugment}
            hoveredSetAugment={hoveredSetAugment}
            hoveredBonusSource={hoveredBonusSource}
            hoveredSetName={hoveredSetName}
            onAugmentHover={setHoveredAugment}
            onSetAugmentHover={setHoveredSetAugment}
            onSetNameHover={setHoveredSetName}
            craftingSelections={currentSetup?.craftingSelections}
            setsData={setsData}
            craftingData={craftingData}
            onGearChange={handleGearChange}
            availableItems={items}
            onPropertyAdd={handlePropertyAdd}
            pinnedSlots={pinnedSlots}
            onTogglePin={handleTogglePin}
            excludedItems={excludedItems}
            onToggleItemIgnore={handleToggleItemIgnore}
            excludedAugments={excludedAugments}
            onExcludedAugmentsChange={handleExcludedAugmentsChange}
            onCraftingChange={handleCraftingChange}
            propertyIndex={propertyIndex}
            excludeSetAugments={excludeSetAugments}
            excludedPacks={excludedPacks}
            headerSlot={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {gearSetups.isLoaded && (
                  <GearSetupTabs
                    setups={gearSetups.setups}
                    activeSetupId={gearSetups.activeSetupId}
                    onSelect={(id) => { void handleSetupSelect(id) }}
                    onAdd={() => { void handleSetupAdd() }}
                    onRename={(id, name) => { void gearSetups.renameSetup(id, name) }}
                    onDelete={(id) => { void gearSetups.deleteSetup(id) }}
                  />
                )}
                {inventoryMap.size > 0 && (
                  <>
                    <Box sx={{ flex: 1 }} />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
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
                        {sortedCharacters.map((char) => (
                          <MenuItem key={char.id} value={String(char.id)}>
                            {char.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {selectedCharacterId !== null && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleLoadEquipped(selectedCharacterId)}
                      >
                        Load {sortedCharacters.find(c => c.id === selectedCharacterId)?.name}'s Gear
                      </Button>
                    )}
                  </>
                )}
              </Box>
            }
          />
        </Paper>

        {/* Right: Summary Table */}
        {currentSetup && selectedProperties.length > 0 && (
          <Paper elevation={2} sx={{ flex: { xl: '0 0 auto' }, width: { xs: '100%', xl: 'auto' } }}>
            <SummaryTable
              setup={currentSetup.setup}
              selectedProperties={selectedProperties}
              setsData={setsData}
              onPropertyHover={setHoveredProperty}
              onBonusSourceHover={setHoveredBonusSource}
              hoveredAugment={hoveredAugment}
              hoveredSetName={hoveredSetName}
              craftingSelections={currentSetup.craftingSelections}
              theoreticalMaxValues={theoreticalMaxValues}
            />
          </Paper>
        )}
      </Box>
    </Container>
  )
}
