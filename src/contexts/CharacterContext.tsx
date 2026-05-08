import { ReactNode, useMemo } from 'react'

import { getCharacterDisplayName, Quest, RaidActivityEntry } from '@/api/ddoAudit'
import { CHARACTERS } from '@/config/characters'
import { getPlayerName } from '@/domains/raids/raidLogic'
import { CharacterContext, Character } from './useCharacter'

interface CharacterProviderProps {
  charactersById: Record<string, Omit<Character, 'id'>>
  raidActivity: RaidActivityEntry[]
  questsById: Record<string, Quest>
  children: ReactNode
}

export function CharacterProvider({ charactersById, raidActivity, questsById, children }: CharacterProviderProps) {
  const charactersByPlayer = useMemo(() => {
    const entries = Object.entries(charactersById ?? {})

    const map = new Map<string, Character[]>()
    for (const [id, c] of entries) {
      const player = CHARACTERS[id]?.player ?? getPlayerName(c?.name as string)
      const arr = map.get(player) ?? []
      arr.push({ ...c, id } as Character)
      map.set(player, arr)
    }

    const groups = Array.from(map.entries()).map(([player, chars]) => {
      const sorted = chars.slice().sort((a, b) => {
        const aName = getCharacterDisplayName(a.name, { isAnonymous: a.is_anonymous })
        const bName = getCharacterDisplayName(b.name, { isAnonymous: b.is_anonymous })
        return aName.localeCompare(bName)
      })
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
    const entries = Object.entries(charactersById ?? {})

    for (const [id, c] of entries) {
      if (c?.is_online) {
        const player = CHARACTERS[id]?.player ?? getPlayerName(c.name as string)
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
        raidActivity,
        questsById,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}
