import { DDOAUDIT_BASE_URL, MAX_CHARACTER_IDS_PER_REQUEST } from './constants'
import { chunk } from './helpers'

export interface FetchOptions {
  signal?: AbortSignal
}

export async function fetchCharactersByIds(characterIds: string[], options: FetchOptions = {}): Promise<Record<string, any>> {
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
      return (json?.data ?? {}) as Record<string, any>
    }),
  )

  const merged: Record<string, any> = {}
  for (const obj of results) {
    Object.assign(merged, obj)
  }
  return merged
}

export async function fetchRaidActivity(characterIds: string[], options: FetchOptions = {}): Promise<any[]> {
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
      return (json?.data ?? []) as any[]
    }),
  )

  return results.flat()
}
