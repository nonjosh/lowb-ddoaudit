import { createContext, useContext, useMemo } from 'react'
import { getPlayerName } from '../raidLogic'

interface PlayerStatusContextType {
  isPlayerOnline: (playerName: string) => boolean
}

const PlayerStatusContext = createContext<PlayerStatusContextType | null>(null)

export function usePlayerStatus() {
  const context = useContext(PlayerStatusContext)
  if (!context) {
    throw new Error('usePlayerStatus must be used within a PlayerStatusProvider')
  }
  return context
}

interface PlayerStatusProviderProps {
  charactersById: Record<string, any>
  children: React.ReactNode
}

export function PlayerStatusProvider({ charactersById, children }: PlayerStatusProviderProps) {
  const onlineStatus = useMemo(() => {
    const status = new Map<string, boolean>()
    const values = Object.values(charactersById ?? {})

    for (const c of values) {
      if (c?.is_online) {
        const player = getPlayerName(c.name)
        status.set(player, true)
      }
    }
    return status
  }, [charactersById])

  const isPlayerOnline = (playerName: string) => {
    return onlineStatus.get(playerName) ?? false
  }

  return (
    <PlayerStatusContext.Provider value={{ isPlayerOnline }}>
      {children}
    </PlayerStatusContext.Provider>
  )
}
