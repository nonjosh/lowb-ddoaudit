import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import {
  addRansackTimer,
  deleteExpiredTimers,
  deleteRansackTimer,
  getAllRansackTimers,
  RansackTimer,
} from '@/storage/ransackDb'

import { RansackContext, RansackContextValue } from './useRansack'

interface RansackProviderProps {
  children: ReactNode
}

export function RansackProvider({ children }: RansackProviderProps) {
  const [timers, setTimers] = useState<RansackTimer[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTimers = useCallback(async () => {
    try {
      await deleteExpiredTimers()
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
      refreshTimers,
      getTimersForPlayer,
    }),
    [timers, timersByPlayer, loading, addTimer, deleteTimer, refreshTimers, getTimersForPlayer]
  )

  return <RansackContext.Provider value={value}>{children}</RansackContext.Provider>
}
