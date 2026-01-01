import itemsData from '@/assets/items.json'

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
  
  const matches = items.filter((item) => {
    if (!item.quests || !Array.isArray(item.quests)) return false
    
    return item.quests.some((q) => {
      const normalizedQ = q.trim().toLowerCase()
      // Prioritize exact matches, then allow partial matches for flexibility
      return normalizedQ === normalizedQuestName || 
             normalizedQ.includes(normalizedQuestName) ||
             normalizedQuestName.includes(normalizedQ)
    })
  })
  
  // Sort: exact matches first, then by minimum level descending, then by name
  return matches.sort((a, b) => {
    // Check if either has an exact match
    const aExact = (a.quests ?? []).some((q) => q.trim().toLowerCase() === normalizedQuestName)
    const bExact = (b.quests ?? []).some((q) => q.trim().toLowerCase() === normalizedQuestName)
    
    if (aExact !== bExact) return aExact ? -1 : 1
    
    // Sort by minimum level descending, then by name
    if (a.ml !== b.ml) return b.ml - a.ml
    return a.name.localeCompare(b.name)
  })
}
