import { CRAFTING_JSON_URL } from './constants'
import { ItemAffix } from './items'

export interface CraftingOption {
  name?: string
  affixes?: ItemAffix[]
  quests?: string[]
  ml?: number
}

export type CraftingData = Record<string, Record<string, CraftingOption[]>>

let craftingPromise: Promise<CraftingData> | null = null

export async function fetchCrafting(): Promise<CraftingData> {
  if (craftingPromise) return craftingPromise

  craftingPromise = (async () => {
    const resp = await fetch(CRAFTING_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch crafting.json (${resp.status})`)
    }

    return await resp.json() as CraftingData
  })()

  return craftingPromise
}
