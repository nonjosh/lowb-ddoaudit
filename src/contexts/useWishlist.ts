import { createContext, useContext } from 'react'

import type { Item } from '@/api/ddoGearPlanner'

export interface WishlistEntry {
  key: string
  name: string
  ml: number
  slot: string
  type?: string
  quests?: string[]
  url?: string
  addedAt: number
}

export interface WishlistContextValue {
  entriesByKey: Record<string, WishlistEntry>
  keys: string[]
  isWished: (item: Pick<Item, 'name' | 'ml' | 'slot' | 'type'>) => boolean
  toggleWish: (item: Pick<Item, 'name' | 'ml' | 'slot' | 'type' | 'quests' | 'url'>) => void
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
