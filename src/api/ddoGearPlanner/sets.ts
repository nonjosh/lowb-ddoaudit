import { SETS_JSON_URL } from './constants'

let setsPromise: Promise<any> | null = null

export async function fetchSets(): Promise<any> {
  if (setsPromise) return setsPromise

  setsPromise = (async () => {
    const resp = await fetch(SETS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch sets.json (${resp.status})`)
    }

    return await resp.json()
  })()

  return setsPromise
}