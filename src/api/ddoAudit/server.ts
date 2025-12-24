import { DDOAUDIT_BASE_URL } from './constants'

export interface ServerFetchOptions {
  signal?: AbortSignal
}

export interface ServerInfo {
  is_online?: boolean | null
  character_count?: number | null
  last_status_check?: string | null
}

export async function fetchServerInfo(serverName: string, options: ServerFetchOptions = {}): Promise<ServerInfo | null> {
  const server = serverName.trim()
  const url = new URL(`${DDOAUDIT_BASE_URL}/game/server-info`)
  url.searchParams.set('server', server)

  const resp = await fetch(url.toString(), { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch server info (${resp.status})`)
  }

  const json = await resp.json()

  if (!json) return null

  const top = json?.data && typeof json.data === 'object' ? json.data : json

  const key = server.toLowerCase()
  if (top && typeof top === 'object' && key in top) {
    return top[key] as ServerInfo
  }

  if (top && typeof top === 'object' && ('is_online' in top || 'character_count' in top)) {
    return top as ServerInfo
  }

  return null
}
