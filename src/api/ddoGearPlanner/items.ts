import { ITEMS_JSON_URL } from './constants'

export interface ItemAffix {
  name: string
  type: string
  value: string | number
}

export interface Item {
  name: string
  ml: number
  quests?: string[]
  slot: string
  type?: string
  affixes: ItemAffix[]
  crafting?: string[]
  url?: string
  sets?: string[]
  artifact?: boolean
}

let itemsPromise: Promise<Item[]> | null = null

export async function fetchItems(): Promise<Item[]> {
  if (itemsPromise) return itemsPromise

  itemsPromise = (async () => {
    const resp = await fetch(ITEMS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch items.json (${resp.status})`)
    }

    const data = await resp.json()
    return Array.isArray(data) ? data : []
  })()

  return itemsPromise
}
