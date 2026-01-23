// Unified character mapping for DDO Audit
// Maps characterId to { name, player, ... }
//
// Data sources:
// - src/data/lowb.json: Player name -> character names mapping
// - src/data/character_ids.csv: Character name -> character ID mapping
//
// To add new characters:
// 1. Add the character name to the appropriate player in lowb.json
// 2. Run `npx tsx scripts/update-character-ids.ts` to fetch the character ID from the API
//
// Note: The player name in lowb.json IS the display name (e.g., "老mic" not "OldMic")

import lowbData from '@/data/lowb.json'
import characterIdsCsv from '@/data/character_ids.csv?raw'

export interface CharacterInfo {
  id: string
  name: string
  player: string
}

// Type for the lowb.json structure: player name -> character names array
export type PlayerCharacterMapping = Record<string, string[]>

// Parse the CSV content to get character name -> ID mapping
function parseCharacterIdsCsv(csvContent: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = csvContent.trim().split('\n')

  // Skip header line (name,id)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const [name, id] = line.split(',')
    if (name && id) {
      map.set(name.trim().toLowerCase(), id.trim())
    }
  }

  return map
}

// Parse data at module load time
const characterNameToId = parseCharacterIdsCsv(characterIdsCsv)
const playerCharacterMapping = lowbData as PlayerCharacterMapping

// Generate the flat CHARACTERS map from the player-character mapping and ID lookup
export const CHARACTERS: Record<string, CharacterInfo> = (() => {
  const out: Record<string, CharacterInfo> = {}

  for (const [player, characterNames] of Object.entries(playerCharacterMapping)) {
    for (const name of characterNames) {
      const id = characterNameToId.get(name.toLowerCase())
      if (!id) {
        console.warn(`No character ID found for "${name}" (player: ${player})`)
        continue
      }
      out[id] = { id, name, player }
    }
  }

  return out
})()

// List of all expected player names (keys from lowb.json)
export const EXPECTED_PLAYERS = Object.keys(playerCharacterMapping)

// For backward compatibility: player -> character names mapping
export const CHARACTERS_BY_PLAYER: PlayerCharacterMapping = playerCharacterMapping
