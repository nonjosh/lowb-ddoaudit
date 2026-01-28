import { ReactNode, useCallback, useEffect, useState } from 'react'

import { parseMultipleTroveFiles } from '@/api/trove/parser'
import type { TroveCharacter, TroveItemLocation } from '@/api/trove/types'
import {
  clearTroveData,
  loadTroveCharacters,
  loadTroveImportTime,
  loadTroveInventory,
  loadTroveSelectedCharacters,
  saveTroveCharacters,
  saveTroveImportTime,
  saveTroveInventory,
  saveTroveSelectedCharacters
} from '@/storage/troveDb'

import { TroveContext, TroveContextValue } from './useTrove'

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
  const [importedAt, setImportedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved data on mount
  useEffect(() => {
    async function loadSavedData() {
      try {
        const [inventory, chars, time, selected] = await Promise.all([
          loadTroveInventory(),
          loadTroveCharacters(),
          loadTroveImportTime(),
          loadTroveSelectedCharacters()
        ])

        setInventoryMap(inventory)
        setCharacters(chars)
        setImportedAt(time)
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
      setImportedAt(null)
    } catch (err) {
      console.error('Failed to clear Trove data:', err)
    }
  }, [])

  // Set selected character
  const setSelectedCharacterAction = useCallback(
    async (characterId: number | null) => {
      setSelectedCharacterId(characterId)
      await saveTroveSelectedCharacters(characterId !== null ? [characterId] : [])
    },
    []
  )

  // Check if item exists
  const hasItem = useCallback(
    (itemName: string): boolean => {
      return inventoryMap.has(itemName)
    },
    [inventoryMap]
  )

  // Get item locations
  const getItemLocations = useCallback(
    (itemName: string): TroveItemLocation[] => {
      return inventoryMap.get(itemName) || []
    },
    [inventoryMap]
  )

  // Check if item is available considering character selection
  const isItemAvailableForCharacters = useCallback(
    (itemName: string): boolean => {
      const locations = inventoryMap.get(itemName)
      if (!locations || locations.length === 0) return false

      // If no character filter, any location counts
      if (selectedCharacterId === null) {
        return true
      }

      // Check if item is available to selected character
      return locations.some((loc) => {
        // Shared bank (characterId = 0) is always available
        if (loc.characterId === 0) return true

        // BTA items are available to all
        if (loc.binding !== 'BoundToCharacter') return true

        // BTC items only count if owned by the selected character
        return loc.characterId === selectedCharacterId
      })
    },
    [inventoryMap, selectedCharacterId]
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
    importedAt,
    loading,
    error,
    importFiles,
    clearData,
    setSelectedCharacter: setSelectedCharacterAction,
    hasItem,
    getItemLocations,
    isItemAvailableForCharacters,
    getStats,
    getEquippedItems
  }

  return <TroveContext.Provider value={value}>{children}</TroveContext.Provider>
}
