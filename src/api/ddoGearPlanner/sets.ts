import { SETS_JSON_URL } from './constants'
import { ItemAffix } from './items'

export interface SetBonus {
  threshold: number
  affixes: ItemAffix[]
}

export type SetsData = Record<string, SetBonus[]>

let setsPromise: Promise<SetsData> | null = null

export async function fetchSets(): Promise<SetsData> {
  if (setsPromise) return setsPromise

  setsPromise = (async () => {
    const resp = await fetch(SETS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch sets.json (${resp.status})`)
    }

    return await resp.json() as SetsData
  })()

  return setsPromise
}
