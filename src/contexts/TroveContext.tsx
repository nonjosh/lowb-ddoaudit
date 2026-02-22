import { ReactNode, useCallback, useEffect, useState } from 'react'

import { parseMultipleTroveFiles } from '@/api/trove/parser'
import type { TroveCharacter, TroveItemLocation } from '@/api/trove/types'
import {
  clearTroveData,
  loadTroveCharacters,
  loadTroveHiddenCharacters,
  loadTroveImportTime,
  loadTroveInventory,
  loadTroveSelectedCharacters,
  saveTroveCharacters,
  saveTroveHiddenCharacters,
  saveTroveImportTime,
  saveTroveInventory,
  saveTroveSelectedCharacters
} from '@/storage/troveDb'

import { TroveContext, TroveContextValue } from './useTrove'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Strip the "(level X)" suffix from gear planner item names.
 * Trove inventory uses base names (e.g. "Mysterious Cloak") while the gear
 * planner appends a level tag (e.g. "Mysterious Cloak (level 21)").
 */
const LEVEL_SUFFIX_RE = /\s*\(level (\d+)\)$/i

function getBaseItemName(name: string): string {
  return name.replace(LEVEL_SUFFIX_RE, '')
}

/** Extract the level number from a "(level X)" suffix, or undefined. */
function getLevelFromName(name: string): number | undefined {
  const m = LEVEL_SUFFIX_RE.exec(name)
  return m ? Number(m[1]) : undefined
}

// ============================================================================
// Provider Component
// ============================================================================

interface TroveProviderProps {
  children: ReactNode
}

export function TroveProvider({ children }: TroveProviderProps) {
  const [inventoryMap, setInventoryMap] = useState<
    Map<string, TroveItemLocation[]>
  >(new Map())
  const [characters, setCharacters] = useState<TroveCharacter[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [hiddenCharacterIds, setHiddenCharacterIds] = useState<number[]>([])
  const [importedAt, setImportedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved data on mount
  useEffect(() => {
    async function loadSavedData() {
      try {
        const [inventory, chars, time, selected, hidden] = await Promise.all([
          loadTroveInventory(),
          loadTroveCharacters(),
          loadTroveImportTime(),
          loadTroveSelectedCharacters(),
          loadTroveHiddenCharacters()
        ])

        setInventoryMap(inventory)
        setCharacters(chars)
        setImportedAt(time)
        setHiddenCharacterIds(hidden)
        // Convert array to single value (use first if exists)
        setSelectedCharacterId(selected.length > 0 ? selected[0] : null)
      } catch (err) {
        console.error('Failed to load Trove data:', err)
      }
    }

    void loadSavedData()
  }, [])

  // Import files
  const importFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)

    try {
      const data = await parseMultipleTroveFiles(files)

      // Save to IndexedDB
      await saveTroveInventory(data.inventoryMap)
      await saveTroveCharacters(data.characters)
      await saveTroveImportTime(data.importedAt)

      // Update state
      setInventoryMap(data.inventoryMap)
      setCharacters(data.characters)
      setImportedAt(data.importedAt)

      // Reset selected character on new import
      setSelectedCharacterId(null)
      await saveTroveSelectedCharacters([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import files')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear all data
  const clearData = useCallback(async () => {
    try {
      await clearTroveData()
      setInventoryMap(new Map())
      setCharacters([])
      setSelectedCharacterId(null)
      setHiddenCharacterIds([])
      setImportedAt(null)
    } catch (err) {
      console.error('Failed to clear Trove data:', err)
    }
  }, [])

  // Toggle character visibility
  const toggleCharacterVisibility = useCallback(async (characterId: number) => {
    setHiddenCharacterIds(prev => {
      const newHidden = prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
      saveTroveHiddenCharacters(newHidden).catch(console.error)
      return newHidden
    })
  }, [])

  // Set selected character
  const setSelectedCharacterAction = useCallback(
    async (characterId: number | null) => {
      setSelectedCharacterId(characterId)
      await saveTroveSelectedCharacters(characterId !== null ? [characterId] : [])
    },
    []
  )

  /**
   * Look up inventory locations for an item, falling back to the base name
   * (without "(level X)" suffix) when the exact name isn't found.
   */
  const lookupLocations = useCallback(
    (itemName: string): TroveItemLocation[] | undefined => {
      // Exact name match (covers Trove names that already match gear planner names)
      const exact = inventoryMap.get(itemName)
      if (exact) return exact

      // Fallback: strip the "(level X)" suffix that the gear planner adds
      const baseName = getBaseItemName(itemName)
      if (baseName === itemName) return undefined

      const baseLocations = inventoryMap.get(baseName)
      if (!baseLocations || baseLocations.length === 0) return undefined

      // Filter to locations whose stored minimumLevel matches the requested level.
      // If a location has no stored level (old data before this field was added),
      // include it as a lenient fallback.
      const requestedLevel = getLevelFromName(itemName)
      if (requestedLevel === undefined) return baseLocations

      const filtered = baseLocations.filter(
        loc => loc.minimumLevel === undefined || loc.minimumLevel === requestedLevel
      )
      return filtered.length > 0 ? filtered : undefined
    },
    [inventoryMap]
  )

  // Check if item exists
  const hasItem = useCallback(
    (itemName: string): boolean => {
      return (lookupLocations(itemName)?.length ?? 0) > 0
    },
    [lookupLocations]
  )

  // Get item locations
  const getItemLocations = useCallback(
    (itemName: string): TroveItemLocation[] => {
      return lookupLocations(itemName) || []
    },
    [lookupLocations]
  )

  // Check if item is available considering character selection
  const isItemAvailableForCharacters = useCallback(
    (itemName: string): boolean => {
      const locations = lookupLocations(itemName)
      if (!locations || locations.length === 0) return false

      // If no character filter, any location counts
      if (selectedCharacterId === null) {
        return true
      }

      // Check if item is available to selected character
      return locations.some((loc) => {
        // Shared bank (characterId = 0) is always available
        if (loc.characterId === 0) return true

        // BTA items (explicitly BoundToAccount) are available to all characters
        if (loc.binding === 'BoundToAccount') return true

        // BTC items only count if owned by the selected character
        if (loc.binding === 'BoundToCharacter') {
          return loc.characterId === selectedCharacterId
        }

        // For any other binding type or undefined binding, treat as unavailable to be safe
        return false
      })
    },
    [lookupLocations, selectedCharacterId]
  )

  // Get stats about imported items (equipment only for BTC count)
  const getStats = useCallback((equipmentNames?: Set<string>) => {
    const uniqueBTA = new Set<string>()
    const btcPerCharacter = new Map<number, number>()

    for (const [itemName, locations] of inventoryMap.entries()) {
      // Filter to equipment if provided
      const isEquipment = !equipmentNames || equipmentNames.has(itemName)

      for (const loc of locations) {
        if (loc.binding === 'BoundToCharacter' && isEquipment) {
          btcPerCharacter.set(loc.characterId, (btcPerCharacter.get(loc.characterId) || 0) + 1)
        } else if (loc.binding === 'BoundToAccount' || loc.characterId === 0) {
          uniqueBTA.add(itemName)
        }
      }
    }

    return {
      uniqueBTA: uniqueBTA.size,
      btcPerCharacter
    }
  }, [inventoryMap])

  // Get equipped items for a character
  const getEquippedItems = useCallback((characterId: number): string[] => {
    const equippedItems: string[] = []

    for (const [itemName, locations] of inventoryMap.entries()) {
      for (const loc of locations) {
        if (loc.characterId === characterId && loc.container === 'Equipped') {
          equippedItems.push(itemName)
          break
        }
      }
    }

    return equippedItems
  }, [inventoryMap])

  const value: TroveContextValue = {
    inventoryMap,
    characters,
    selectedCharacterId,
    hiddenCharacterIds,
    importedAt,
    loading,
    error,
    importFiles,
    clearData,
    setSelectedCharacter: setSelectedCharacterAction,
    toggleCharacterVisibility,
    hasItem,
    getItemLocations,
    isItemAvailableForCharacters,
    getStats,
    getEquippedItems
  }

  return <TroveContext.Provider value={value}>{children}</TroveContext.Provider>
}
