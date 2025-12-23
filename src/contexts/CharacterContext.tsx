import { createContext, useContext, useMemo } from 'react'
import { getPlayerName } from '../domains/raids/raidLogic'

export interface Character {
  name: string
  is_online: boolean
  location_id: string
  classes: any[]
  race: string
  [key: string]: any
}

export interface PlayerGroup {
  player: string
  chars: Character[]
}

interface CharacterContextType {
  charactersById: Record<string, Character>
  charactersByPlayer: PlayerGroup[]
  isPlayerOnline: (playerName: string) => boolean
  lfms: Record<string, any>
}

const CharacterContext = createContext<CharacterContextType | null>(null)

export function useCharacter() {
  const context = useContext(CharacterContext)
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider')
  }
  return context
}

interface CharacterProviderProps {
  charactersById: Record<string, any>
  lfms?: Record<string, any>
  children: React.ReactNode
}

export function CharacterProvider({ charactersById, lfms = {}, children }: CharacterProviderProps) {
  const charactersByPlayer = useMemo(() => {
    const values = Object.values(charactersById ?? {})

    const map = new Map<string, Character[]>()
    for (const c of values) {
      const player = getPlayerName(c?.name)
      const arr = map.get(player) ?? []
      arr.push(c)
      map.set(player, arr)
    }

    const groups = Array.from(map.entries()).map(([player, chars]) => {
      const sorted = chars.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)))
      return { player, chars: sorted }
    })

    groups.sort((a, b) => {
      if (a.player === 'Unknown' && b.player !== 'Unknown') return 1
      if (b.player === 'Unknown' && a.player !== 'Unknown') return -1
      return a.player.localeCompare(b.player)
    })
    return groups
  }, [charactersById])

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
    <CharacterContext.Provider
      value={{
        charactersById,
        charactersByPlayer,
        isPlayerOnline,
        lfms,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}
