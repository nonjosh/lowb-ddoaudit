import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import BlockIcon from '@mui/icons-material/Block'
import SaveIcon from '@mui/icons-material/Save'
import ShareIcon from '@mui/icons-material/Share'
import UndoIcon from '@mui/icons-material/Undo'
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
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
import { buildPropertyBonusIndex, buildUpdatedCraftingSelections, EvaluatedGearSetup, evaluateGearSetup, GearCraftingSelections, getAllAvailableProperties, GearSetup, getTheoreticalMax, PropertyBonusIndex } from '@/domains/gearPlanner'
import { useGearSetups } from '@/hooks/useGearSetups'
import { usePropertyPresets } from '@/hooks/usePropertyPresets'
import { useQuestNameToPack } from '@/hooks/useQuestNameToPack'

const SELECTED_PROPERTIES_KEY = 'gearPlanner_selectedProperties'
const SELECTED_SETS_KEY = 'gearPlanner_selectedSets'
const EXCLUDE_SET_AUGMENTS_KEY = 'gearPlanner_excludeSetAugments'
const PINNED_SLOTS_KEY = 'gearPlanner_pinnedSlots'
const EXCLUDED_PACKS_KEY = 'gearPlanner_excludedPacks'
const EXCLUDED_AUGMENTS_KEY = 'gearPlanner_excludedAugments'
const EXCLUDED_ITEMS_KEY = 'gearPlanner_excludedItems'
const ITEM_FILTER_MIN_LEVEL_KEY = 'gearPlanner_itemFilterMinLevel'
const ITEM_FILTER_MAX_LEVEL_KEY = 'gearPlanner_itemFilterMaxLevel'
const ITEM_FILTER_ARMOR_TYPES_KEY = 'gearPlanner_itemFilterArmorTypes'
const ITEM_FILTER_MAIN_HAND_TYPES_KEY = 'gearPlanner_itemFilterMainHandTypes'
const ITEM_FILTER_OFF_HAND_TYPES_KEY = 'gearPlanner_itemFilterOffHandTypes'
const ITEM_FILTER_PACKS_KEY = 'gearPlanner_itemFilterPacks'

export interface ItemFilterState {
  minLevel: number
  maxLevel: number
  armorTypes: string[]
  mainHandTypes: string[]
  offHandTypes: string[]
  includedPacks: string[]
}

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

function loadItemFilterNumber(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      const n = Number(stored)
      if (!isNaN(n)) return n
    }
  } catch { /* ignore */ }
  return fallback
}

function loadItemFilterStringArray(key: string): string[] {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

export default function GearPlanner() {
  const { items, setsData, craftingData, loading, error, refresh } = useGearPlanner()
  const { inventoryMap, characters, selectedCharacterId, setSelectedCharacter, getEquippedItemsWithAugments, hiddenCharacterIds, isItemAvailableForCharacters } = useTrove()
  const questNameToPack = useQuestNameToPack()
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

  // Dirty state: tracks unsaved changes to the current gear setup
  const [isDirty, setIsDirty] = useState(false)
  interface SavedSetupState {
    setup: GearSetup
    craftingSelections?: GearCraftingSelections
    pinnedSlots: Set<string>
  }
  const savedStateRef = useRef<SavedSetupState | null>(null)

  // Item filter state (persisted to localStorage)
  const [itemFilterMinLevel, setItemFilterMinLevel] = useState(() => loadItemFilterNumber(ITEM_FILTER_MIN_LEVEL_KEY, 1))
  const [itemFilterMaxLevel, setItemFilterMaxLevel] = useState(() => loadItemFilterNumber(ITEM_FILTER_MAX_LEVEL_KEY, 34))
  const [itemFilterArmorTypes, setItemFilterArmorTypes] = useState<string[]>(() => loadItemFilterStringArray(ITEM_FILTER_ARMOR_TYPES_KEY))
  const [itemFilterMainHandTypes, setItemFilterMainHandTypes] = useState<string[]>(() => loadItemFilterStringArray(ITEM_FILTER_MAIN_HAND_TYPES_KEY))
  const [itemFilterOffHandTypes, setItemFilterOffHandTypes] = useState<string[]>(() => loadItemFilterStringArray(ITEM_FILTER_OFF_HAND_TYPES_KEY))
  const [itemFilterPacks, setItemFilterPacks] = useState<string[]>(() => loadItemFilterStringArray(ITEM_FILTER_PACKS_KEY))

  const itemFilters: ItemFilterState = useMemo(() => ({
    minLevel: itemFilterMinLevel,
    maxLevel: itemFilterMaxLevel,
    armorTypes: itemFilterArmorTypes,
    mainHandTypes: itemFilterMainHandTypes,
    offHandTypes: itemFilterOffHandTypes,
    includedPacks: itemFilterPacks,
  }), [itemFilterMinLevel, itemFilterMaxLevel, itemFilterArmorTypes, itemFilterMainHandTypes, itemFilterOffHandTypes, itemFilterPacks])

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

  // Whether any Trove inventory data has been imported (used for toggle visibility)
  const hasTroveData = inventoryMap.size > 0

  // Set of item names available in Trove inventory, respecting BTC/character filter
  const ownedItemNames = useMemo(() => {
    const names = new Set<string>()
    for (const itemName of inventoryMap.keys()) {
      if (isItemAvailableForCharacters(itemName)) {
        names.add(itemName)
      }
    }
    return names
  }, [inventoryMap, isItemAvailableForCharacters])

  // Unique types per slot category (for filter dropdowns)
  const { uniqueArmorTypes, uniqueWeaponTypes, uniqueOffHandTypes } = useMemo(() => {
    const armorSet = new Set<string>()
    const weaponSet = new Set<string>()
    const offHandSet = new Set<string>()
    for (const item of items) {
      if (!item.type) continue
      if (item.slot === 'Armor') armorSet.add(item.type)
      else if (item.slot === 'Weapon') weaponSet.add(item.type)
      else if (item.slot === 'Offhand') offHandSet.add(item.type)
    }
    return {
      uniqueArmorTypes: Array.from(armorSet).sort(),
      uniqueWeaponTypes: Array.from(weaponSet).sort(),
      uniqueOffHandTypes: Array.from(offHandSet).sort(),
    }
  }, [items])

  // Unique adventure packs from items (for pack filter dropdown)
  const uniquePacks = useMemo(() => {
    const packMls = new Map<string, Set<number>>()
    for (const item of items) {
      if (!item.quests) continue
      for (const qName of item.quests) {
        const pack = questNameToPack.get(qName)
        if (pack) {
          if (!packMls.has(pack)) packMls.set(pack, new Set())
          if (item.slot !== 'Augment') packMls.get(pack)!.add(item.ml)
        }
      }
    }
    return Array.from(packMls.entries()).map(([pack, mls]) => {
      const mlArr = Array.from(mls).sort((a, b) => a - b)
      const mlDisplay = mlArr.length > 0 ? `ML ${mlArr.join(', ')}` : ''
      return { pack, mlRange: mlDisplay }
    }).sort((a, b) => a.pack.localeCompare(b.pack))
  }, [items, questNameToPack])

  // Callbacks for item filter changes (persist to localStorage)
  const handleItemFilterMinLevel = useCallback((v: number) => {
    setItemFilterMinLevel(v)
    localStorage.setItem(ITEM_FILTER_MIN_LEVEL_KEY, String(v))
  }, [])
  const handleItemFilterMaxLevel = useCallback((v: number) => {
    setItemFilterMaxLevel(v)
    localStorage.setItem(ITEM_FILTER_MAX_LEVEL_KEY, String(v))
  }, [])
  const handleItemFilterArmorTypes = useCallback((v: string[]) => {
    setItemFilterArmorTypes(v)
    localStorage.setItem(ITEM_FILTER_ARMOR_TYPES_KEY, JSON.stringify(v))
  }, [])
  const handleItemFilterMainHandTypes = useCallback((v: string[]) => {
    setItemFilterMainHandTypes(v)
    localStorage.setItem(ITEM_FILTER_MAIN_HAND_TYPES_KEY, JSON.stringify(v))
  }, [])
  const handleItemFilterOffHandTypes = useCallback((v: string[]) => {
    setItemFilterOffHandTypes(v)
    localStorage.setItem(ITEM_FILTER_OFF_HAND_TYPES_KEY, JSON.stringify(v))
  }, [])
  const handleItemFilterPacks = useCallback((v: string[]) => {
    setItemFilterPacks(v)
    localStorage.setItem(ITEM_FILTER_PACKS_KEY, JSON.stringify(v))
  }, [])

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
      savedStateRef.current = { setup: data.setup, craftingSelections: data.craftingSelections, pinnedSlots: data.pinnedSlots }
    } else {
      // Empty setup
      setCurrentSetup(null)
      setPinnedSlots(new Set())
      savePinnedSlots(new Set())
      setPinnedItems({})
      savedStateRef.current = { setup: {}, pinnedSlots: new Set() }
    }
    setIsDirty(false)
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
        savedStateRef.current = { setup: data.setup, craftingSelections: data.craftingSelections, pinnedSlots: data.pinnedSlots }
      }
      setIsDirty(false)
    }
    void loadInitial()
  }, [gearSetups.isLoaded, items.length, gearSetups.activeSetupId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle gear setup tab switch (auto-save if dirty before switching)
  const handleSetupSelect = useCallback(async (id: number) => {
    if (isDirty && currentSetup) {
      void gearSetups.saveCurrentSetup(currentSetup.setup, currentSetup.craftingSelections, pinnedSlots)
    }
    gearSetups.selectSetup(id)
    await applyLoadedSetup(id)
  }, [gearSetups, applyLoadedSetup, isDirty, currentSetup, pinnedSlots])

  // Handle creating a new gear setup tab (auto-save if dirty first)
  const handleSetupAdd = useCallback(async () => {
    if (isDirty && currentSetup) {
      void gearSetups.saveCurrentSetup(currentSetup.setup, currentSetup.craftingSelections, pinnedSlots)
    }
    await gearSetups.createSetup()
    setCurrentSetup(null)
    setPinnedSlots(new Set())
    savePinnedSlots(new Set())
    setPinnedItems({})
    savedStateRef.current = { setup: {}, pinnedSlots: new Set() }
    setIsDirty(false)
  }, [gearSetups, isDirty, currentSetup, pinnedSlots])

  // Save current setup to DB explicitly
  const handleSaveSetup = useCallback(() => {
    if (!currentSetup) return
    void gearSetups.saveCurrentSetup(currentSetup.setup, currentSetup.craftingSelections, pinnedSlots)
    savedStateRef.current = { setup: currentSetup.setup, craftingSelections: currentSetup.craftingSelections, pinnedSlots: new Set(pinnedSlots) }
    setIsDirty(false)
  }, [gearSetups, currentSetup, pinnedSlots])

  // Undo: revert to last saved state
  const handleUndoSetup = useCallback(() => {
    const saved = savedStateRef.current
    if (!saved) return
    setPinnedSlots(saved.pinnedSlots)
    savePinnedSlots(saved.pinnedSlots)
    const newPinnedItems: GearSetup = {}
    saved.pinnedSlots.forEach(slot => {
      const item = saved.setup[slot as keyof GearSetup]
      if (item) newPinnedItems[slot as keyof GearSetup] = item
    })
    setPinnedItems(newPinnedItems)
    if (Object.keys(saved.setup).length > 0) {
      setCurrentSetup(buildEvaluatedSetup(saved.setup, selectedProperties, saved.craftingSelections))
    } else {
      setCurrentSetup(null)
    }
    setIsDirty(false)
  }, [selectedProperties, buildEvaluatedSetup])

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
      setIsDirty(true)
      return newSet
    })
  }, [])

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
    const equippedItems = getEquippedItemsWithAugments(characterId)

    const itemsByName = new Map(items.map(item => [item.name, item]))
    const setup: GearSetup = {}
    const slotItemMap = new Map<string, { item: Item; augmentNames: Map<string, string> }>()

    for (const equipped of equippedItems) {
      const item = itemsByName.get(equipped.name)
      if (item && item.slot) {
        const slotKey = item.slot.toLowerCase()
        let gearSlot: string | null = null
        if (slotKey === 'ring') {
          if (!setup.ring1) { setup.ring1 = item; gearSlot = 'ring1' }
          else if (!setup.ring2) { setup.ring2 = item; gearSlot = 'ring2' }
        } else if (slotKey === 'weapon') {
          setup.mainHand = item; gearSlot = 'mainHand'
        } else if (slotKey === 'offhand') {
          setup.offHand = item; gearSlot = 'offHand'
        } else if (slotKey === 'armor') {
          setup.armor = item; gearSlot = 'armor'
        } else if (slotKey === 'belt') {
          setup.belt = item; gearSlot = 'belt'
        } else if (slotKey === 'boots') {
          setup.boots = item; gearSlot = 'boots'
        } else if (slotKey === 'bracers') {
          setup.bracers = item; gearSlot = 'bracers'
        } else if (slotKey === 'cloak') {
          setup.cloak = item; gearSlot = 'cloak'
        } else if (slotKey === 'gloves') {
          setup.gloves = item; gearSlot = 'gloves'
        } else if (slotKey === 'goggles') {
          setup.goggles = item; gearSlot = 'goggles'
        } else if (slotKey === 'helm') {
          setup.helm = item; gearSlot = 'helm'
        } else if (slotKey === 'necklace') {
          setup.necklace = item; gearSlot = 'necklace'
        } else if (slotKey === 'trinket') {
          setup.trinket = item; gearSlot = 'trinket'
        }

        if (gearSlot && equipped.augmentSlots) {
          // Build a mapping of Trove slot type name → augment effect name
          const augmentNames = new Map<string, string>()
          for (const aug of equipped.augmentSlots) {
            if (aug.Effect?.Name) {
              augmentNames.set(aug.Name, aug.Effect.Name)
            }
          }
          slotItemMap.set(gearSlot, { item, augmentNames })
        }
      }
    }

    // Build crafting selections from Trove augment data
    const craftingSelections: GearCraftingSelections = {}
    if (craftingData) {
      for (const [gearSlot, { item, augmentNames }] of slotItemMap) {
        if (!item.crafting || item.crafting.length === 0) continue
        const selections: { slotType: string; option: CraftingOption | null }[] = item.crafting.map(slotType => {
          // Find if there's a Trove augment for this slot type
          const troveAugmentName = augmentNames.get(slotType)
          if (!troveAugmentName) return { slotType, option: null }

          // Look up matching crafting option
          const slotData = craftingData[slotType]
          if (!slotData) return { slotType, option: null }
          const options = slotData[item.name] ?? slotData['*'] ?? []
          const match = options.find(opt => opt.name === troveAugmentName)
          return { slotType, option: match ?? null }
        })
        if (selections.some(s => s.option !== null)) {
          craftingSelections[gearSlot] = selections
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

    const hasAugmentSelections = Object.keys(craftingSelections).length > 0
    const evaluated = buildEvaluatedSetup(setup, selectedProperties, hasAugmentSelections ? craftingSelections : undefined)
    setCurrentSetup(evaluated)
    setIsDirty(true)
  }, [getEquippedItemsWithAugments, items, craftingData, selectedProperties, pinnedSlots, pinnedItems, buildEvaluatedSetup])

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
    setIsDirty(true)
  }, [selectedProperties.length])

  // Handle manual gear change
  const handleGearChange = useCallback((slot: string, item: Item | undefined) => {
    const newSetup: GearSetup = { ...(currentSetup?.setup ?? {}), [slot]: item }

    const evaluated = buildEvaluatedSetup(newSetup, selectedProperties)
    setCurrentSetup(evaluated)
    setIsDirty(true)
  }, [currentSetup, selectedProperties, buildEvaluatedSetup])

  // Handle applying a full setup from GearSuggestions
  const handleApplySetup = useCallback((setup: GearSetup) => {
    const evaluated = buildEvaluatedSetup(setup, selectedProperties)
    setCurrentSetup(evaluated)
    setIsDirty(true)
  }, [selectedProperties, buildEvaluatedSetup])

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
    setIsDirty(true)
  }, [currentSetup, selectedProperties, buildEvaluatedSetup])

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

      {/* Item Filters */}
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Item Filters</Typography>
        <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          {/* Level Range: dropdown + slider */}
          <Box sx={{ minWidth: 250, maxWidth: 350, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Level Range:</Typography>
              <FormControl size="small">
                <Select
                  variant="standard"
                  disableUnderline
                  value={itemFilterMinLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val <= itemFilterMaxLevel) handleItemFilterMinLevel(val)
                  }}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {Array.from({ length: 34 }, (_, i) => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption">-</Typography>
              <FormControl size="small">
                <Select
                  variant="standard"
                  disableUnderline
                  value={itemFilterMaxLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val >= itemFilterMinLevel) handleItemFilterMaxLevel(val)
                  }}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {Array.from({ length: 34 }, (_, i) => i + 1).map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Slider
              value={[itemFilterMinLevel, itemFilterMaxLevel]}
              onChange={(_, newValue) => {
                if (Array.isArray(newValue)) {
                  handleItemFilterMinLevel(newValue[0])
                  handleItemFilterMaxLevel(newValue[1])
                }
              }}
              valueLabelDisplay="auto"
              min={1}
              max={34}
              size="small"
            />
          </Box>

          {/* Armor Type */}
          {uniqueArmorTypes.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Armor Type</InputLabel>
              <Select
                multiple
                value={itemFilterArmorTypes}
                input={<OutlinedInput label="Armor Type" />}
                renderValue={(selected) => selected.length === 0 ? '' : selected.length === uniqueArmorTypes.length ? 'All' : selected.join(', ')}
                onChange={(e) => {
                  const value = e.target.value
                  handleItemFilterArmorTypes(typeof value === 'string' ? value.split(',') : value)
                }}
              >
                <MenuItem dense onClick={(e) => { e.preventDefault(); handleItemFilterArmorTypes(itemFilterArmorTypes.length === uniqueArmorTypes.length ? [] : [...uniqueArmorTypes]) }}>
                  <Checkbox checked={itemFilterArmorTypes.length === uniqueArmorTypes.length} indeterminate={itemFilterArmorTypes.length > 0 && itemFilterArmorTypes.length < uniqueArmorTypes.length} size="small" />
                  <ListItemText primary={itemFilterArmorTypes.length === uniqueArmorTypes.length ? 'Deselect All' : 'Select All'} />
                </MenuItem>
                <Divider />
                {uniqueArmorTypes.map(type => (
                  <MenuItem key={type} value={type} dense>
                    <Checkbox checked={itemFilterArmorTypes.includes(type)} size="small" />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Main Hand Type */}
          {uniqueWeaponTypes.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Main Hand Type</InputLabel>
              <Select
                multiple
                value={itemFilterMainHandTypes}
                input={<OutlinedInput label="Main Hand Type" />}
                renderValue={(selected) => selected.length === 0 ? '' : `${selected.length} selected`}
                onChange={(e) => {
                  const value = e.target.value
                  handleItemFilterMainHandTypes(typeof value === 'string' ? value.split(',') : value)
                }}
              >
                <MenuItem dense onClick={(e) => { e.preventDefault(); handleItemFilterMainHandTypes(itemFilterMainHandTypes.length === uniqueWeaponTypes.length ? [] : [...uniqueWeaponTypes]) }}>
                  <Checkbox checked={itemFilterMainHandTypes.length === uniqueWeaponTypes.length} indeterminate={itemFilterMainHandTypes.length > 0 && itemFilterMainHandTypes.length < uniqueWeaponTypes.length} size="small" />
                  <ListItemText primary={itemFilterMainHandTypes.length === uniqueWeaponTypes.length ? 'Deselect All' : 'Select All'} />
                </MenuItem>
                <Divider />
                {uniqueWeaponTypes.map(type => (
                  <MenuItem key={type} value={type} dense>
                    <Checkbox checked={itemFilterMainHandTypes.includes(type)} size="small" />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Off Hand Type */}
          {uniqueOffHandTypes.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Off Hand Type</InputLabel>
              <Select
                multiple
                value={itemFilterOffHandTypes}
                input={<OutlinedInput label="Off Hand Type" />}
                renderValue={(selected) => selected.length === 0 ? '' : selected.length === uniqueOffHandTypes.length ? 'All' : selected.join(', ')}
                onChange={(e) => {
                  const value = e.target.value
                  handleItemFilterOffHandTypes(typeof value === 'string' ? value.split(',') : value)
                }}
              >
                <MenuItem dense onClick={(e) => { e.preventDefault(); handleItemFilterOffHandTypes(itemFilterOffHandTypes.length === uniqueOffHandTypes.length ? [] : [...uniqueOffHandTypes]) }}>
                  <Checkbox checked={itemFilterOffHandTypes.length === uniqueOffHandTypes.length} indeterminate={itemFilterOffHandTypes.length > 0 && itemFilterOffHandTypes.length < uniqueOffHandTypes.length} size="small" />
                  <ListItemText primary={itemFilterOffHandTypes.length === uniqueOffHandTypes.length ? 'Deselect All' : 'Select All'} />
                </MenuItem>
                <Divider />
                {uniqueOffHandTypes.map(type => (
                  <MenuItem key={type} value={type} dense>
                    <Checkbox checked={itemFilterOffHandTypes.includes(type)} size="small" />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Adventure Pack */}
          {uniquePacks.length > 0 && (
            <Autocomplete
              multiple
              size="small"
              limitTags={1}
              options={uniquePacks}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option.mlRange ? `${option.pack} (${option.mlRange})` : option.pack
              }}
              isOptionEqualToValue={(option, value) => {
                const optPack = typeof option === 'string' ? option : option.pack
                const valPack = typeof value === 'string' ? value : value.pack
                return optPack === valPack
              }}
              value={uniquePacks.filter(p => itemFilterPacks.includes(p.pack))}
              onChange={(_, newValue) => handleItemFilterPacks(newValue.map(v => typeof v === 'string' ? v : v.pack))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Adventure Pack"
                  placeholder="Select pack..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  return <Chip key={key} {...tagProps} label={typeof option === 'string' ? option : option.pack} size="small" />
                })
              }
              sx={{ minWidth: 200, flex: 1 }}
            />
          )}

          {/* Active filter indicator */}
          {(itemFilterMinLevel > 1 || itemFilterMaxLevel < 34 || itemFilterArmorTypes.length > 0 || itemFilterMainHandTypes.length > 0 || itemFilterOffHandTypes.length > 0 || itemFilterPacks.length > 0) && (
            <Chip
              label="Filters active"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
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
            excludedItems={excludedItems}
            onApplySetup={handleApplySetup}
            ownedItemNames={ownedItemNames}
            hasTroveData={hasTroveData}
            onExcludeSetAugmentsChange={(exclude) => {
              setExcludeSetAugments(exclude)
              saveExcludeSetAugments(exclude)
            }}
            itemFilters={itemFilters}
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
            itemFilters={itemFilters}
            headerSlot={
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {gearSetups.isLoaded && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <GearSetupTabs
                      setups={gearSetups.setups}
                      activeSetupId={gearSetups.activeSetupId}
                      isDirty={isDirty}
                      onSelect={(id) => { void handleSetupSelect(id) }}
                      onAdd={() => { void handleSetupAdd() }}
                      onRename={(id, name) => { void gearSetups.renameSetup(id, name) }}
                      onDelete={(id) => { void gearSetups.deleteSetup(id) }}
                    />
                    {isDirty && (
                      <>
                        <Tooltip title="Save changes">
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={handleSaveSetup}
                            startIcon={<SaveIcon />}
                            sx={{ minWidth: 0, textTransform: 'none', py: 0.25, px: 1 }}
                          >
                            Save
                          </Button>
                        </Tooltip>
                        <Tooltip title="Undo unsaved changes">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleUndoSetup}
                            startIcon={<UndoIcon />}
                            sx={{ minWidth: 0, textTransform: 'none', py: 0.25, px: 1 }}
                          >
                            Undo
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                )}
                {inventoryMap.size > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                  </Box>
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
