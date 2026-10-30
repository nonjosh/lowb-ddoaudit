import { DDOAUDIT_BASE_URL, MAX_CHARACTER_IDS_PER_REQUEST } from './constants'
import { chunk, normalizeRaceName } from './helpers'

export interface FetchOptions {
  signal?: AbortSignal
}

export interface CharacterData {
  id?: number | string
  name: string
  total_level: number
  race: string
  classes: Array<{ name: string; level: number }>
  is_anonymous?: boolean
  is_online?: boolean
  location_id?: string
  group_id?: string
  is_in_party?: boolean
  guild_name?: string | null
  last_update?: string
}

export interface RaidActivityEntry {
  character_id: string
  timestamp: string
  data: {
    quest_ids: string[]
  }
}

export async function fetchCharactersByIds(characterIds: string[], options: FetchOptions = {}): Promise<Record<string, CharacterData>> {
  if (!characterIds?.length) return {}

  const batches = chunk(characterIds, MAX_CHARACTER_IDS_PER_REQUEST)
  const results = await Promise.all(
    batches.map(async (batch) => {
      const url = `${DDOAUDIT_BASE_URL}/characters/ids/${batch.join(',')}`
      const resp = await fetch(url, { signal: options.signal })
      if (!resp.ok) {
        throw new Error(`Failed to fetch characters (${resp.status})`)
      }
      const json = await resp.json()
      const data = (json?.data ?? {}) as Record<string, CharacterData>
      // Normalize race names (workaround for API returning "Unknown: <id>" for new races)
      for (const char of Object.values(data)) {
        char.race = normalizeRaceName(char.race)
      }
      return data
    }),
  )

  const merged: Record<string, CharacterData> = {}
  for (const obj of results) {
    Object.assign(merged, obj)
  }
  return merged
}

export interface ServerCharacter {
  id: number
  name: string
  gender: string
  race: string
  total_level: number
  classes: Array<{ name: string; level: number }>
  location_id: number
  guild_name: string
  server_name: string
  home_server_name: string
  group_id: number
  is_online: boolean
  is_in_party: boolean
  is_anonymous: boolean
  /** Last time DDO Audit saw this character, ISO. Present for offline characters too. */
  last_update?: string | null
}

export async function fetchServerCharacters(serverName: string, options: FetchOptions = {}): Promise<ServerCharacter[]> {
  const url = `${DDOAUDIT_BASE_URL}/characters/${encodeURIComponent(serverName)}`
  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch server characters (${resp.status})`)
  }
  const json = await resp.json()
  const data = json?.data ?? json ?? {}
  const characters = Object.values(data) as ServerCharacter[]
  for (const char of characters) {
    char.race = normalizeRaceName(char.race)
  }
  return characters
}

/**
 * Exact-name lookup that also finds offline characters (the roster endpoint only lists
 * online ones). Returns null when the name is unknown on that server.
 */
export async function fetchServerCharacterByName(
  serverName: string,
  name: string,
  options: FetchOptions = {},
): Promise<ServerCharacter | null> {
  const url = `${DDOAUDIT_BASE_URL}/characters/${encodeURIComponent(serverName)}/${encodeURIComponent(name)}`
  const resp = await fetch(url, { signal: options.signal })
  if (resp.status === 404) return null
  if (!resp.ok) {
    throw new Error(`Failed to look up character (${resp.status})`)
  }

  const json = await resp.json()
  const data = (json?.data ?? null) as ServerCharacter | null
  if (!data) return null
  data.race = normalizeRaceName(data.race)
  return data
}

export async function fetchRaidActivity(characterIds: string[], options: FetchOptions = {}): Promise<RaidActivityEntry[]> {
  if (!characterIds?.length) return []

  const batches = chunk(characterIds, MAX_CHARACTER_IDS_PER_REQUEST)
  const results = await Promise.all(
    batches.map(async (batch) => {
      const url = new URL(`${DDOAUDIT_BASE_URL}/activity/raids`)
      url.searchParams.set('character_ids', batch.join(','))

      const resp = await fetch(url, { signal: options.signal })
      if (!resp.ok) {
        throw new Error(`Failed to fetch raid activity (${resp.status})`)
      }
      const json = await resp.json()
      return (json?.data ?? []) as RaidActivityEntry[]
    }),
  )

  return results.flat()
}
