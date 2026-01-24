import { createContext, useContext } from 'react'
import { Quest, RaidActivityEntry } from '@/api/ddoAudit'

export interface Character {
  id: string
  name: string
  is_online?: boolean
  location_id?: string
  group_id?: string
  is_in_party?: boolean
  classes: CharacterClass[]
  race: string
  total_level: number
  last_update?: string
}

export interface CharacterClass {
  name: string
  level: number
}

export interface PlayerGroup {
  player: string
  chars: Character[]
}

interface CharacterContextType {
  charactersById: Record<string, Omit<Character, 'id'>>
  charactersByPlayer: PlayerGroup[]
  isPlayerOnline: (playerName: string) => boolean
  raidActivity: RaidActivityEntry[]
  questsById: Record<string, Quest>
}

export const CharacterContext = createContext<CharacterContextType | null>(null)

export function useCharacter() {
  const context = useContext(CharacterContext)
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider')
  }
  return context
}

/**
 * Optional version of useCharacter that returns null when not in a CharacterProvider
 */
export function useCharacterOptional(): CharacterContextType | null {
  return useContext(CharacterContext)
}
