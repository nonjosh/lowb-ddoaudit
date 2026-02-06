import { useCallback, useEffect, useRef } from 'react'

import { Character } from '@/contexts/useCharacter'

interface LocationEntry {
  locationId: string
  enteredAt: string // ISO timestamp
  isConfirmed: boolean // true after we've seen them at this location on a subsequent update
}

type LocationTrackingData = Record<string, LocationEntry>

/**
 * Hook to track how long characters have been in their current location.
 * Stores tracking data in memory only (resets on page refresh).
 * Duration only shows after confirming the character stayed at the same location.
 */
export function useLocationTracking(charactersById: Record<string, Omit<Character, 'id'>> | undefined) {
  // Use a ref to store tracking data in memory (not persisted)
  const trackingDataRef = useRef<LocationTrackingData>({})

  // Update tracking when characters change locations
  useEffect(() => {
    if (!charactersById) return

    const now = new Date().toISOString()
    const entries = Object.entries(charactersById)
    const newData = { ...trackingDataRef.current }

    for (const [id, char] of entries) {
      // Only track online characters with a location
      if (!char?.is_online || !char.location_id) {
        continue
      }

      const currentLocationId = String(char.location_id)
      const existing = newData[id]

      if (!existing) {
        // First time seeing this character - record but don't confirm yet
        newData[id] = {
          locationId: currentLocationId,
          enteredAt: now,
          isConfirmed: false,
        }
      } else if (existing.locationId !== currentLocationId) {
        // Character moved to a new location - reset tracking
        newData[id] = {
          locationId: currentLocationId,
          enteredAt: now,
          isConfirmed: false,
        }
      } else if (!existing.isConfirmed) {
        // Same location as before - now we can confirm they stayed
        newData[id] = {
          ...existing,
          isConfirmed: true,
        }
      }
    }

    trackingDataRef.current = newData
  }, [charactersById])

  /**
   * Get the duration (in milliseconds) that a character has been at their current location.
   * Returns null if the character is not tracked, offline, or location not yet confirmed.
   */
  const getLocationDuration = useCallback(
    (characterId: string): number | null => {
      const entry = trackingDataRef.current[characterId]
      if (!entry?.enteredAt) return null

      // Only show duration after we've confirmed they stayed at this location
      if (!entry.isConfirmed) return null

      const enteredAt = new Date(entry.enteredAt)
      if (Number.isNaN(enteredAt.getTime())) return null

      return Date.now() - enteredAt.getTime()
    },
    []
  )

  /**
   * Get the entry timestamp for a character's current location.
   * Returns null if not tracked.
   */
  const getLocationEnteredAt = useCallback(
    (characterId: string): string | null => {
      return trackingDataRef.current[characterId]?.enteredAt ?? null
    },
    []
  )

  return {
    getLocationDuration,
    getLocationEnteredAt,
  }
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * Examples: "5m", "2h 30m", "1d 5h"
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return ''

  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const minutes = totalMinutes - days * 60 * 24 - hours * 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return '<1m'
}
