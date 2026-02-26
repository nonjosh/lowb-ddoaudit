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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, CraftingOption } from '@/api/ddoGearPlanner'
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
import { calculateScore, getAllAvailableProperties, optimizeGear, OptimizedGearSetup, GearSetup, buildUpdatedCraftingSelections } from '@/domains/gearPlanner'
import { useGearSetups } from '@/hooks/useGearSetups'
import { usePropertyPresets } from '@/hooks/usePropertyPresets'

const SELECTED_PROPERTIES_KEY = 'gearPlanner_selectedProperties'
const SELECTED_SETS_KEY = 'gearPlanner_selectedSets'
const SELECTED_INDEX_KEY = 'gearPlanner_selectedIndex'
const MAX_ML_KEY = 'gearPlanner_maxML'
const ARMOR_TYPE_KEY = 'gearPlanner_armorType'
const EXCLUDE_SET_AUGMENTS_KEY = 'gearPlanner_excludeSetAugments'
const MUST_INCLUDE_ARTIFACT_KEY = 'gearPlanner_mustIncludeArtifact'
const PINNED_SLOTS_KEY = 'gearPlanner_pinnedSlots'
const AUTO_OPTIMIZE_KEY = 'gearPlanner_autoOptimize'
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
  const { inventoryMap, isItemAvailableForCharacters, characters, selectedCharacterId, setSelectedCharacter, getEquippedItems, hiddenCharacterIds } = useTrove()
  const gearSetups = useGearSetups()
  const propertyPresets = usePropertyPresets()
  const [selectedProperties, setSelectedProperties] = useState<string[]>(loadSelectedProperties)
  const [selectedSets, setSelectedSets] = useState<string[]>(loadSelectedSets)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(loadSelectedIndex)
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  const [hoveredAugment, setHoveredAugment] = useState<string | null>(null)
  const [hoveredSetAugment, setHoveredSetAugment] = useState<string | null>(null)
  const [hoveredBonusSource, setHoveredBonusSource] = useState<HoveredBonusSource | null>(null)
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

  // Get available sets from setsData
  const availableSets = useMemo(() => {
    if (!setsData) return []
    return Object.keys(setsData).sort()
  }, [setsData])

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

      // Calculate score with current properties
      const result = calculateScore(
        data.setup, selectedProperties, setsData, craftingData, excludeSetAugments,
        [], [],
        data.craftingSelections
      )
      setManualSetup({
        setup: data.setup,
        score: result.score,
        propertyValues: result.propertyValues,
        unusedAugments: result.unusedAugments,
        totalAugments: result.totalAugments,
        extraProperties: result.extraProperties,
        otherEffects: result.otherEffects,
        activeSets: result.activeSets,
        craftingSelections: data.craftingSelections ?? result.craftingSelections
      })
    } else {
      // Empty setup
      setManualSetup(null)
      setPinnedSlots(new Set())
      savePinnedSlots(new Set())
      setPinnedItems({})
    }
  }, [items, craftingData, selectedProperties, setsData, excludeSetAugments, gearSetups])

  // Load active gear setup from DB when items become available
  useEffect(() => {
    if (!gearSetups.isLoaded || items.length === 0 || !gearSetups.activeSetupId) return
    if (initialSetupLoadedRef.current) return
    initialSetupLoadedRef.current = true

    void applyLoadedSetup(gearSetups.activeSetupId)
  }, [gearSetups.isLoaded, items.length, gearSetups.activeSetupId, applyLoadedSetup])

  // Handle gear setup tab switch
  const handleSetupSelect = useCallback(async (id: number) => {
    gearSetups.selectSetup(id)
    await applyLoadedSetup(id)
  }, [gearSetups, applyLoadedSetup])

  // Handle creating a new gear setup tab
  const handleSetupAdd = useCallback(async () => {
    await gearSetups.createSetup()
    // New tab starts empty
    setManualSetup(null)
    setPinnedSlots(new Set())
    savePinnedSlots(new Set())
    setPinnedItems({})
  }, [gearSetups])

  // Auto-save helper: save current setup state to DB
  const autoSaveSetup = useCallback((
    setup: GearSetup,
    craftingSelections?: ReturnType<typeof calculateScore>['craftingSelections'],
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
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
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
      // Auto-save with updated pins
      autoSaveSetup(currentSetup, undefined, newSet)
      return newSet
    })
    // Don't clear manual setup - pinned items should stay
    // Trigger re-optimization if auto-optimize is enabled
    if (autoOptimize) {
      setOptimizationKey(k => k + 1)
    }
  }, [autoOptimize, autoSaveSetup])

  // Handle manual refresh button click
  const handleManualRefresh = useCallback(() => {
    setOptimizationKey(k => k + 1)
  }, [])

  // Handle exclusion changes
  const handleExcludedPacksChange = useCallback((packs: string[]) => {
    setExcludedPacks(packs)
    saveExcludedPacks(packs)
    if (autoOptimize) {
      setOptimizationKey(k => k + 1)
    }
  }, [autoOptimize])

  const handleExcludedAugmentsChange = useCallback((augments: string[]) => {
    setExcludedAugments(augments)
    saveExcludedAugments(augments)
    if (autoOptimize) {
      setOptimizationKey(k => k + 1)
    }
  }, [autoOptimize])

  const handleExcludedItemsChange = useCallback((items: string[]) => {
    setExcludedItems(items)
    saveExcludedItems(items)
    if (autoOptimize) {
      setOptimizationKey(k => k + 1)
    }
  }, [autoOptimize])

  const handleToggleItemIgnore = useCallback((itemName: string) => {
    setExcludedItems(prev => {
      const newList = prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
      saveExcludedItems(newList)
      if (autoOptimize) {
        setOptimizationKey(k => k + 1)
      }
      return newList
    })
  }, [autoOptimize])

  // Handle property selection change with persistence
  const handlePropertiesChange = (properties: string[]) => {
    setSelectedProperties(properties)
    saveSelectedProperties(properties)
    // Reset to first suggestion when properties change
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
    // Clear active preset since properties changed manually
    propertyPresets.selectPreset(null)
    // Don't clear manual setup - let optimization re-run with pinned items
  }

  // Handle set effects selection change with persistence
  const handleSetsChange = (sets: string[]) => {
    setSelectedSets(sets)
    saveSelectedSets(sets)
    // Reset to first suggestion when sets change
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
    // Clear active preset since sets changed manually
    propertyPresets.selectPreset(null)
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
      // Don't clear manual setup - let optimization re-run with pinned items
      // Trigger re-optimization if auto-optimize is enabled
      if (autoOptimize) {
        setOptimizationKey(k => k + 1)
      }
    }
  }, [selectedProperties, autoOptimize])

  // Handle suggestion selection change with persistence
  const handleSuggestionSelect = (index: number) => {
    setSelectedSuggestionIndex(index)
    saveSelectedIndex(index)
    // Clear manual setup when selecting from suggestions
    setManualSetup(null)
    // Auto-save the selected suggestion
    const suggestion = optimizedSetups[index]
    if (suggestion) {
      autoSaveSetup(suggestion.setup, suggestion.craftingSelections)
    }
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
      // Keep pin only if the same item is in the loaded setup
      if (pinnedItem && loadedItem && pinnedItem.name === loadedItem.name) {
        newPinnedSlots.add(slot)
        newPinnedItems[slot as keyof GearSetup] = pinnedItem
      }
    })
    setPinnedSlots(newPinnedSlots)
    setPinnedItems(newPinnedItems)
    savePinnedSlots(newPinnedSlots)

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

    // Auto-save loaded gear
    autoSaveSetup(setup, result.craftingSelections, newPinnedSlots)

    // Reset property selection index since we're showing manual setup
    setSelectedSuggestionIndex(0)
  }, [getEquippedItems, items, selectedProperties, setsData, craftingData, excludeSetAugments, pinnedSlots, pinnedItems, autoSaveSetup])

  // Handle importing a gear setup from an external ddo-gear-planner URL
  const handleExternalUrlImport = useCallback((importedSetup: OptimizedGearSetup, trackedProperties?: string[]) => {
    // If tracked properties are provided and we have none selected, adopt them
    if (trackedProperties && trackedProperties.length > 0 && selectedProperties.length === 0) {
      setSelectedProperties(trackedProperties)
      saveSelectedProperties(trackedProperties)
    }

    // Clear pins when importing
    setPinnedSlots(new Set())
    setPinnedItems({})
    savePinnedSlots(new Set())

    setManualSetup(importedSetup)
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)

    // Auto-save imported gear
    autoSaveSetup(importedSetup.setup, importedSetup.craftingSelections, new Set())
  }, [selectedProperties.length, autoSaveSetup])

  // Optimize gear when properties change
  const optimizedSetups = useMemo(() => {
    if (selectedProperties.length < 3 || items.length === 0) return []

    // Build pinned gear setup from pinnedItems state
    let pinnedGearSetup: GearSetup | undefined = undefined
    if (pinnedSlots.size > 0 && Object.keys(pinnedItems).length > 0) {
      pinnedGearSetup = { ...pinnedItems }
    }

    // Create item filter for available items mode and exclusions
    const itemFilter = (item: { name: string; quests?: string[] }) => {
      // Check if excluded by name
      if (excludedItems.includes(item.name)) return false

      // Check if from excluded adventure pack
      if (excludedPacks.length > 0 && item.quests) {
        if (item.quests.some(quest => excludedPacks.includes(quest))) {
          return false
        }
      }

      // Check if available for characters (if mode is enabled)
      if (availableItemsOnly && inventoryMap.size > 0) {
        return isItemAvailableForCharacters(item.name)
      }

      return true
    }
    return optimizeGear(items, setsData, {
      properties: selectedProperties,
      maxResults: 20,
      craftingData,
      itemFilter,
      maxML,
      armorType,
      excludeSetAugments,
      mustIncludeArtifact,
      pinnedGear: pinnedGearSetup,
      excludedAugments,
      excludedPacks
    })
    // optimizationKey is intentionally included to force re-optimization when manual refresh is clicked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, setsData, craftingData, selectedProperties, availableItemsOnly, inventoryMap, isItemAvailableForCharacters, maxML, armorType, excludeSetAugments, mustIncludeArtifact, pinnedSlots, pinnedItems, excludedItems, excludedPacks, excludedAugments, optimizationKey])

  // Handle manual gear change
  const handleGearChange = useCallback((slot: string, item: Item | undefined) => {
    // Get the current setup (from manual setup or selected suggestion)
    const currentSetup = manualSetup || optimizedSetups[Math.min(selectedSuggestionIndex, optimizedSetups.length - 1)]
    if (!currentSetup) return

    const newSetup: GearSetup = { ...currentSetup.setup }
    newSetup[slot as keyof GearSetup] = item

    // Recalculate score (auto-select crafting for new setup)
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

    // Auto-save gear change
    autoSaveSetup(newSetup, result.craftingSelections)
  }, [manualSetup, optimizedSetups, selectedSuggestionIndex, selectedProperties, setsData, craftingData, excludeSetAugments, autoSaveSetup])

  // Handle manual crafting/augment change for a specific slot
  const handleCraftingChange = useCallback((gearSlot: string, slotIndex: number, option: CraftingOption | null) => {
    const currentSetup = manualSetup || optimizedSetups[Math.min(selectedSuggestionIndex, optimizedSetups.length - 1)]
    if (!currentSetup) return

    const item = currentSetup.setup[gearSlot as keyof GearSetup]
    const newCraftingSelections = buildUpdatedCraftingSelections(
      currentSetup.craftingSelections ?? {},
      gearSlot,
      slotIndex,
      option,
      item?.crafting
    )

    // Recalculate score using the manually overridden crafting selections
    const result = calculateScore(
      currentSetup.setup,
      selectedProperties,
      setsData,
      craftingData,
      excludeSetAugments,
      [],
      [],
      newCraftingSelections
    )

    setManualSetup({
      setup: currentSetup.setup,
      score: result.score,
      propertyValues: result.propertyValues,
      unusedAugments: result.unusedAugments,
      totalAugments: result.totalAugments,
      extraProperties: result.extraProperties,
      otherEffects: result.otherEffects,
      activeSets: result.activeSets,
      craftingSelections: newCraftingSelections
    })

    // Auto-save crafting change
    autoSaveSetup(currentSetup.setup, newCraftingSelections)
  }, [manualSetup, optimizedSetups, selectedSuggestionIndex, selectedProperties, setsData, craftingData, excludeSetAugments, autoSaveSetup])

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
      {/* Header: Title + Gear Setup Tabs + Action Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ flexShrink: 0 }}>
          Gear Planner
        </Typography>

        {/* Gear Setup Tabs (inline with title) */}
        {gearSetups.isLoaded && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <GearSetupTabs
              setups={gearSetups.setups}
              activeSetupId={gearSetups.activeSetupId}
              onSelect={(id) => { void handleSetupSelect(id) }}
              onAdd={() => { void handleSetupAdd() }}
              onRename={(id, name) => { void gearSetups.renameSetup(id, name) }}
              onDelete={(id) => { void gearSetups.deleteSetup(id) }}
            />
          </Box>
        )}

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
        currentSetup={selectedSetup?.setup}
        currentCraftingSelections={selectedSetup?.craftingSelections}
        selectedProperties={selectedProperties}
        maxML={maxML}
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

      {/* Properties + Presets + Filters — unified panel */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <PropertySelector
          availableProperties={availableProperties}
          selectedProperties={selectedProperties}
          onChange={handlePropertiesChange}
          availableSets={availableSets}
          selectedSets={selectedSets}
          onSetsChange={handleSetsChange}
          autoOptimize={autoOptimize}
          onAutoOptimizeChange={(value) => {
            setAutoOptimize(value)
            saveAutoOptimize(value)
          }}
          onManualRefresh={handleManualRefresh}
        />
        {/* Property Presets */}
        {propertyPresets.isLoaded && (
          <Box sx={{ px: 2, pb: 1.5 }}>
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
          </Box>
        )}

        {/* Optimization Filters — inside the same panel */}
        {selectedProperties.length >= 3 && (
          <Box sx={{ px: 2, pb: 2, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Filters:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
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
              <FormControl size="small" sx={{ minWidth: 130 }}>
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
                sx={{ ml: 0 }}
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
                sx={{ ml: 0 }}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Inventory / Character bar */}
      <Paper elevation={2} sx={{ p: 1.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {inventoryMap.size > 0 ? (
            <>
              <FormControl size="small" sx={{ minWidth: 180 }}>
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
                  sx={{ mr: 0, ml: 0.5 }}
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
          ) : (
            <Typography variant="body2" color="text.secondary">
              Import Trove data via the <strong>Trove</strong> button in the toolbar to load character gear and filter by owned items.
            </Typography>
          )}
        </Box>
      </Paper>

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
