import { ReactNode, useMemo } from 'react'

import { getPlayerName } from '@/domains/raids/raidLogic'
import { Quest } from '@/api/ddoAudit'
import { CharacterContext, Character, RaidActivityEntry } from './useCharacter'

interface CharacterProviderProps {
  charactersById: Record<string, Omit<Character, 'id'>>
  lfms?: Record<string, unknown>
  raidActivity: RaidActivityEntry[]
  questsById: Record<string, Quest>
  children: ReactNode
}

export function CharacterProvider({ charactersById, lfms = {}, raidActivity, questsById, children }: CharacterProviderProps) {
  const charactersByPlayer = useMemo(() => {
    const entries = Object.entries(charactersById ?? {})

    const map = new Map<string, Character[]>()
    for (const [id, c] of entries) {
      const player = getPlayerName(c?.name)
      const arr = map.get(player) ?? []
      arr.push({ ...c, id })
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
        raidActivity,
        questsById,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}
