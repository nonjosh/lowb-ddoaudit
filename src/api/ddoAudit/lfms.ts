import { DDOAUDIT_BASE_URL } from './constants'

export interface FetchOptions {
  signal?: AbortSignal
}

export async function fetchLfms(serverName = 'shadowdale', options: FetchOptions = {}): Promise<Record<string, any>> {
  const server = String(serverName ?? '').trim() || 'shadowdale'
  const url = `${DDOAUDIT_BASE_URL}/lfms/${encodeURIComponent(server)}`
  const resp = await fetch(url, { signal: options.signal })
  if (!resp.ok) {
    throw new Error(`Failed to fetch LFMs (${resp.status})`)
  }
  const json = await resp.json()

  const normalize = (value: any): Record<string, any> => {
    if (!value) return {}

    if (typeof value === 'object' && !Array.isArray(value) && value?.data) {
      return normalize(value.data)
    }

    if (Array.isArray(value)) {
      const out: Record<string, any> = {}
      for (const item of value) {
        const id = item?.id
        if (id === null || id === undefined) continue
        out[String(id)] = item
      }
      return out
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 1) {
        const onlyKey = keys[0]
        const nested = value?.[onlyKey]
        if (
          nested &&
          typeof nested === 'object' &&
          !Array.isArray(nested) &&
          !('quest_id' in value) &&
          !('id' in value) &&
          Object.values(nested).some((x) => x && typeof x === 'object' && 'quest_id' in x)
        ) {
          return nested
        }
      }
      return value
    }

    return {}
  }

  return normalize(json)
}
