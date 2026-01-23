import { createContext, useContext } from 'react'

import type { RansackTimer } from '@/storage/ransackDb'

export interface RansackContextValue {
  timers: RansackTimer[]
  timersByPlayer: Record<string, RansackTimer[]>
  loading: boolean
  addTimer: (timer: Omit<RansackTimer, 'id'>) => Promise<void>
  deleteTimer: (id: number) => Promise<void>
  refreshTimers: () => Promise<void>
  getTimersForPlayer: (playerName: string) => RansackTimer[]
}

export const RansackContext = createContext<RansackContextValue | null>(null)

export function useRansack() {
  const context = useContext(RansackContext)
  if (!context) {
    throw new Error('useRansack must be used within a RansackProvider')
  }
  return context
}
