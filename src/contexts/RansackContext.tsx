import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  addRansackTimer,
  deleteExpiredTimers,
  deleteRansackTimer,
  getAllRansackTimers,
  RansackTimer,
  setRansackTimerChecked,
} from '@/storage/ransackDb'

import { RansackContext, RansackContextValue } from './useRansack'

interface RansackProviderProps {
  children: ReactNode
}

const DEMO_SEED_QUERY_PARAM = 'seedRansackDemo'

function buildDemoRansackTimers(now: Date): Omit<RansackTimer, 'id'>[] {
  const buildExpiry = (days: number, hours: number) => {
    return new Date(now.getTime() + (((days * 24) + hours) * 60 * 60 * 1000)).toISOString()
  }

  return [
    {
      characterId: 'demo-garei',
      characterName: 'Garei',
      questId: 'demo-stealing-from-sorcere',
      questName: 'Stealing from Sorcere',
      createdAt: now.toISOString(),
      expiresAt: buildExpiry(5, 22),
      isRansacked: false,
      playerName: 'Michael',
    },
    {
      characterId: 'demo-garei',
      characterName: 'Garei',
      questId: 'demo-isle-of-dread',
      questName: 'The Isle of Dread',
      createdAt: now.toISOString(),
      expiresAt: buildExpiry(6, 10),
      isRansacked: true,
      playerName: 'Michael',
    },
    {
      characterId: 'demo-kayos',
      characterName: 'Kayos',
      questId: 'demo-stealing-from-sorcere',
      questName: 'Stealing from Sorcere',
      createdAt: now.toISOString(),
      expiresAt: buildExpiry(3, 9),
      isRansacked: true,
      playerName: 'Michael',
    },
    {
      characterId: 'demo-warkon',
      characterName: 'Warkon',
      questId: 'demo-stealing-from-sorcere',
      questName: 'Stealing from Sorcere',
      createdAt: now.toISOString(),
      expiresAt: buildExpiry(1, 10),
      isRansacked: false,
      playerName: 'Michael',
    },
  ]
}

export function RansackProvider({ children }: RansackProviderProps) {
  const [timers, setTimers] = useState<RansackTimer[]>([])
  const [loading, setLoading] = useState(true)
  const hasAttemptedDemoSeed = useRef(false)

  const refreshTimers = useCallback(async () => {
    try {
      await deleteExpiredTimers()

      // Dev-only shortcut so the loot-ransack UI can be checked without manual setup.
      if (!hasAttemptedDemoSeed.current && import.meta.env.DEV && typeof window !== 'undefined') {
        hasAttemptedDemoSeed.current = true
        const searchParams = new URLSearchParams(window.location.search)

        if (searchParams.has(DEMO_SEED_QUERY_PARAM)) {
          const demoTimers = buildDemoRansackTimers(new Date())

          for (const timer of demoTimers) {
            await addRansackTimer(timer)
          }
        }
      }

      const allTimers = await getAllRansackTimers()
      setTimers(allTimers)
    } catch (error) {
      console.error('Failed to refresh ransack timers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTimers()
  }, [refreshTimers])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTimers()
    }, 60000)
    return () => clearInterval(interval)
  }, [refreshTimers])

  const timersByPlayer = useMemo(() => {
    const byPlayer: Record<string, RansackTimer[]> = {}
    for (const timer of timers) {
      if (!byPlayer[timer.playerName]) {
        byPlayer[timer.playerName] = []
      }
      byPlayer[timer.playerName].push(timer)
    }
    return byPlayer
  }, [timers])

  const addTimer = useCallback<RansackContextValue['addTimer']>(
    async (timer) => {
      await addRansackTimer(timer)
      await refreshTimers()
    },
    [refreshTimers]
  )

  const deleteTimer = useCallback<RansackContextValue['deleteTimer']>(
    async (id) => {
      await deleteRansackTimer(id)
      await refreshTimers()
    },
    [refreshTimers]
  )

  const setTimerChecked = useCallback<RansackContextValue['setTimerChecked']>(
    async (id, isRansacked) => {
      await setRansackTimerChecked(id, isRansacked)
      await refreshTimers()
    },
    [refreshTimers]
  )

  const getTimersForPlayer = useCallback<RansackContextValue['getTimersForPlayer']>(
    (playerName) => {
      return timersByPlayer[playerName] ?? []
    },
    [timersByPlayer]
  )

  const value = useMemo<RansackContextValue>(
    () => ({
      timers,
      timersByPlayer,
      loading,
      addTimer,
      deleteTimer,
      setTimerChecked,
      refreshTimers,
      getTimersForPlayer,
    }),
    [timers, timersByPlayer, loading, addTimer, deleteTimer, setTimerChecked, refreshTimers, getTimersForPlayer]
  )

  return <RansackContext.Provider value={value}>{children}</RansackContext.Provider>
}
