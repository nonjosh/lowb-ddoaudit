import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import type { Item } from '@/api/ddoGearPlanner'

import { WishlistContext, WishlistContextValue, WishlistEntry } from './useWishlist'

const STORAGE_KEY = 'ddoaudit:wishlist:v1'

function normalizePart(value: string) {
  return String(value ?? '').trim().toLowerCase()
}

function getWishlistKey(item: Pick<Item, 'name' | 'ml' | 'slot' | 'type'>) {
  const name = normalizePart(item.name)
  const ml = Number(item.ml ?? 0)
  const slot = normalizePart(item.slot)
  const type = normalizePart(item.type ?? '')
  return `${name}__${ml}__${slot}__${type}`
}

function safeReadWishlist(): Record<string, WishlistEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}

    const obj = parsed as Record<string, WishlistEntry>
    const cleaned: Record<string, WishlistEntry> = {}
    for (const [key, entry] of Object.entries(obj)) {
      if (!entry || typeof entry !== 'object') continue
      if (typeof entry.key !== 'string' || entry.key !== key) continue
      if (typeof entry.name !== 'string') continue
      if (typeof entry.ml !== 'number') continue
      if (typeof entry.slot !== 'string') continue
      cleaned[key] = entry
    }
    return cleaned
  } catch {
    return {}
  }
}

function safeWriteWishlist(entriesByKey: Record<string, WishlistEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesByKey))
  } catch {
    // ignore
  }
}

interface WishlistProviderProps {
  children: ReactNode
}

export function WishlistProvider({ children }: WishlistProviderProps) {
  const [entriesByKey, setEntriesByKey] = useState<Record<string, WishlistEntry>>(() => {
    if (typeof window === 'undefined') return {}
    return safeReadWishlist()
  })

  useEffect(() => {
    safeWriteWishlist(entriesByKey)
  }, [entriesByKey])

  const keys = useMemo(() => {
    return Object.values(entriesByKey)
      .sort((a, b) => b.addedAt - a.addedAt)
      .map((e) => e.key)
  }, [entriesByKey])

  const isWished = useCallback<WishlistContextValue['isWished']>((item) => {
    const key = getWishlistKey(item)
    return Boolean(entriesByKey[key])
  }, [entriesByKey])

  const toggleWish = useCallback<WishlistContextValue['toggleWish']>((item) => {
    const key = getWishlistKey(item)
    setEntriesByKey((prev) => {
      if (prev[key]) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      const entry: WishlistEntry = {
        key,
        name: item.name,
        ml: item.ml,
        slot: item.slot,
        type: item.type,
        quests: item.quests,
        url: item.url,
        addedAt: Date.now(),
        // Extended item data
        affixes: item.affixes,
        crafting: item.crafting,
        sets: item.sets,
        artifact: item.artifact,
      }
      return { ...prev, [key]: entry }
    })
  }, [])

  const removeWish = useCallback<WishlistContextValue['removeWish']>((key) => {
    setEntriesByKey((prev) => {
      if (!prev[key]) return prev
      const { [key]: _, ...rest } = prev
      return rest
    })
  }, [])

  const clearAll = useCallback(() => {
    setEntriesByKey({})
  }, [])

  const wishedQuestNames = useMemo(() => {
    const set = new Set<string>()
    for (const entry of Object.values(entriesByKey)) {
      for (const q of entry.quests ?? []) {
        const normalized = normalizePart(q)
        if (normalized) set.add(normalized)
      }
    }
    return set
  }, [entriesByKey])

  const hasWishForQuestName = useCallback<WishlistContextValue['hasWishForQuestName']>((questName) => {
    const normalized = normalizePart(questName)
    if (!normalized) return false

    // Fast path: direct match from stored item quests
    if (wishedQuestNames.has(normalized)) return true

    // Fallback: allow partial match (DDO data sometimes varies slightly)
    for (const q of wishedQuestNames) {
      if (q.includes(normalized) || normalized.includes(q)) return true
    }
    return false
  }, [wishedQuestNames])

  const value: WishlistContextValue = {
    entriesByKey,
    keys,
    isWished,
    toggleWish,
    removeWish,
    clearAll,
    hasWishForQuestName,
  }

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}
