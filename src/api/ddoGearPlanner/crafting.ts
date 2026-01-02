import { CRAFTING_JSON_URL } from './constants'

let craftingPromise: Promise<any> | null = null

export async function fetchCrafting(): Promise<any> {
  if (craftingPromise) return craftingPromise

  craftingPromise = (async () => {
    const resp = await fetch(CRAFTING_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch crafting.json (${resp.status})`)
    }

    return await resp.json()
  })()

  return craftingPromise
}