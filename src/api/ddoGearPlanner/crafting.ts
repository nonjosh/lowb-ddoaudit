import { CRAFTING_JSON_URL } from './constants'

let craftingPromise: Promise<Record<string, unknown>> | null = null

export async function fetchCrafting(): Promise<Record<string, unknown>> {
  if (craftingPromise) return craftingPromise

  craftingPromise = (async () => {
    const resp = await fetch(CRAFTING_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch crafting.json (${resp.status})`)
    }

    return await resp.json() as Record<string, unknown>
  })()

  return craftingPromise
}
