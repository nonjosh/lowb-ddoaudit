import { DDOAUDIT_BASE_URL } from './constants'

export interface FetchOptions {
  signal?: AbortSignal
}

interface LfmCharacter {
  id: string | number
  name: string
  race: string
  total_level: number
  classes: Array<{ name: string; level: number }>
  location_id: number
  guild_name?: string
}

interface LfmActivity {
  timestamp: string
  events?: Array<{ tag: string;[key: string]: unknown }>
}

export interface LfmItem {
  id: string | number
  quest_id: string | number
  minimum_level: number
  maximum_level: number
  leader: LfmCharacter
  members?: LfmCharacter[]
  activity: LfmActivity[]
  difficulty?: string
  comment?: string
  adventure_active_time?: string | number
}

export async function fetchLfms(serverName = 'shadowdale', options: FetchOptions = {}): Promise<Record<string, LfmItem>> {
  const server = String(serverName ?? '').trim() || 'shadowdale'
  const url = `${DDOAUDIT_BASE_URL}/lfms/${encodeURIComponent(server)}`
  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch LFMs (${resp.status})`)
  }
  const json = await resp.json()

  const normalize = (value: unknown): Record<string, LfmItem> => {
    if (!value) return {}

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'data' in value) {
      return normalize((value as { data: unknown }).data)
    }

    if (Array.isArray(value)) {
      const out: Record<string, LfmItem> = {}
      for (const item of value) {
        const typedItem = item as LfmItem
        const id = typedItem?.id
        if (id === null || id === undefined) continue
        out[String(id)] = typedItem
      }
      return out
    }

    if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 1) {
        const onlyKey = keys[0]
        const nested = (value as Record<string, unknown>)?.[onlyKey]
        if (
          nested !== null &&
          typeof nested === 'object' &&
          !Array.isArray(nested) &&
          !('quest_id' in (value as object)) &&
          !('id' in (value as object)) &&
          Object.values(nested).some((x) => x !== null && typeof x === 'object' && 'quest_id' in x)
        ) {
          return nested as Record<string, LfmItem>
        }
      }
      return value as Record<string, LfmItem>
    }

    return {}
  }

  return normalize(json)
}
