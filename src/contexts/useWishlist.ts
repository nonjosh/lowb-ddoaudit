import { createContext, useContext } from 'react'

import type { Item, ItemAffix } from '@/api/ddoGearPlanner'

export interface WishlistEntry {
  key: string
  name: string
  ml: number
  slot?: string // Optional for augments
  type?: string
  quests?: string[]
  url?: string
  addedAt: number
  // Extended item data for rich display
  affixes?: ItemAffix[]
  crafting?: string[]
  sets?: string[]
  artifact?: boolean
  isAugment?: boolean // Flag to identify augment entries
}

export interface WishlistContextValue {
  entriesByKey: Record<string, WishlistEntry>
  keys: string[]
  isWished: (item: Pick<Item, 'name' | 'ml' | 'slot' | 'type'> | { name: string; ml?: number; isAugment: true }) => boolean
  toggleWish: (item: Pick<Item, 'name' | 'ml' | 'slot' | 'type' | 'quests' | 'url' | 'affixes' | 'crafting' | 'sets' | 'artifact'> | { name: string; ml?: number; affixes?: ItemAffix[]; quests?: string[]; isAugment: true }) => void
  removeWish: (key: string) => void
  clearAll: () => void
  hasWishForQuestName: (questName: string) => boolean
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
