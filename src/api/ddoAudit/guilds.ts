import { DDOAUDIT_BASE_URL } from './constants'
import { normalizeRaceName } from './helpers'

export interface GuildCharacter {
  id: number
  name: string
  gender: string
  race: string
  total_level: number
  classes: Array<{ name: string; level: number }>
  location_id: number
  guild_name: string
  server_name: string
  group_id: number
  is_online: boolean
  is_in_party: boolean
  is_anonymous: boolean
  public_comment: string
}

export async function fetchGuildCharacters(
  server: string,
  guildName: string,
  signal?: AbortSignal,
): Promise<GuildCharacter[]> {
  const url = `${DDOAUDIT_BASE_URL}/characters/by-server-and-guild-name/${encodeURIComponent(server)}/${encodeURIComponent(guildName)}`
  const resp = await fetch(url, { signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch guild characters (${resp.status})`)
  }
  const json = await resp.json()
  const data = (json?.data ?? {}) as Record<string, GuildCharacter>
  return Object.values(data).map((c) => ({
    ...c,
    race: normalizeRaceName(c.race),
  }))
}
