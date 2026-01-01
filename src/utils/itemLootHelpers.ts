import itemsData from '../assets/items.json'

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
  url?: string
}

/**
 * Find items that drop from a specific quest
 * @param questName The quest name to search for
 * @returns Array of items that drop from that quest
 */
export function getItemsForQuest(questName: string): Item[] {
  if (!questName) return []
  
  const normalizedQuestName = questName.trim().toLowerCase()
  
  const items = itemsData as Item[]
  
  return items.filter((item) => {
    if (!item.quests || !Array.isArray(item.quests)) return false
    
    return item.quests.some((q) => {
      const normalizedQ = q.trim().toLowerCase()
      return normalizedQ === normalizedQuestName || 
             normalizedQ.includes(normalizedQuestName) ||
             normalizedQuestName.includes(normalizedQ)
    })
  }).sort((a, b) => {
    // Sort by minimum level descending, then by name
    if (a.ml !== b.ml) return b.ml - a.ml
    return a.name.localeCompare(b.name)
  })
}
