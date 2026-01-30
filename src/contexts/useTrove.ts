import { createContext, useContext } from 'react'

import type { TroveCharacter, TroveItemLocation } from '@/api/trove/types'

// ============================================================================
// Context Types
// ============================================================================

export interface TroveContextValue {
  // State
  inventoryMap: Map<string, TroveItemLocation[]>
  characters: TroveCharacter[]
  selectedCharacterId: number | null
  hiddenCharacterIds: number[]
  importedAt: number | null
  loading: boolean
  error: string | null

  // Actions
  importFiles: (files: File[]) => Promise<void>
  clearData: () => Promise<void>
  setSelectedCharacter: (characterId: number | null) => Promise<void>
  toggleCharacterVisibility: (characterId: number) => Promise<void>

  // Helpers
  hasItem: (itemName: string) => boolean
  getItemLocations: (itemName: string) => TroveItemLocation[]
  isItemAvailableForCharacters: (itemName: string) => boolean
  getStats: (equipmentNames?: Set<string>) => { uniqueBTA: number; btcPerCharacter: Map<number, number> }
  getEquippedItems: (characterId: number) => string[]
}

const defaultContext: TroveContextValue = {
  inventoryMap: new Map(),
  characters: [],
  selectedCharacterId: null,
  hiddenCharacterIds: [],
  importedAt: null,
  loading: false,
  error: null,
  importFiles: async () => { },
  clearData: async () => { },
  setSelectedCharacter: async () => { },
  toggleCharacterVisibility: async () => { },
  hasItem: () => false,
  getItemLocations: () => [],
  isItemAvailableForCharacters: () => false,
  getStats: () => ({ uniqueBTA: 0, btcPerCharacter: new Map() }),
  getEquippedItems: () => []
}

export const TroveContext = createContext<TroveContextValue>(defaultContext)

export function useTrove(): TroveContextValue {
  return useContext(TroveContext)
}
