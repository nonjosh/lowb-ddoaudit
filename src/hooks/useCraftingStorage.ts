import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

/**
 * A useState-like hook that persists the value in localStorage.
 * Loads initial value from localStorage on mount and saves on every change.
 */
export function useCraftingStorage<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [key, state])

  return [state, setState]
}
