import { createContext, useContext } from 'react'
import { Quest } from '@/api/ddoAudit'

export interface Character {
  id: string
  name: string
  is_online?: boolean
  location_id?: string
  classes?: CharacterClass[]
  race?: string
  total_level?: number
  [key: string]: unknown
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
  charactersById: Record<string, Character>
  charactersByPlayer: PlayerGroup[]
  isPlayerOnline: (playerName: string) => boolean
  lfms: Record<string, unknown>
  raidActivity: RaidActivityEntry[]
  questsById: Record<string, Quest>
}

export interface RaidActivityEntry {
  character_id: string
  character_name?: string
  [key: string]: unknown
}

export const CharacterContext = createContext<CharacterContextType | null>(null)

export function useCharacter() {
  const context = useContext(CharacterContext)
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider')
  }
  return context
}
