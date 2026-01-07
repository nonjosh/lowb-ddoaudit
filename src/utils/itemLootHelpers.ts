import { Item, CraftingData } from '@/api/ddoGearPlanner'

/**
 * Find items that drop from a specific quest
 * @param items The array of items to search in
 * @param questName The quest name to search for
 * @param craftingData The crafting data to also search for augments
 * @returns Array of items that drop from that quest
 */
export function getItemsForQuest(items: Item[], questName: string, craftingData?: CraftingData | null): Item[] {
  if (!questName) return []

  const normalizedQuestName = questName.trim().toLowerCase()

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

  // Also search in crafting data for augments
  const craftingMatches: Item[] = []
  if (craftingData) {
    for (const slot in craftingData) {
      const slotData = craftingData[slot]
      for (const subSlot in slotData) {
        const subSlotItems = slotData[subSlot]
        if (Array.isArray(subSlotItems)) {
          for (const item of subSlotItems) {
            if (item.quests && Array.isArray(item.quests)) {
              const hasQuest = item.quests.some((q: string) => {
                const normalizedQ = q.trim().toLowerCase()
                return normalizedQ === normalizedQuestName ||
                  normalizedQ.includes(normalizedQuestName) ||
                  normalizedQuestName.includes(normalizedQ)
              })
              if (hasQuest) {
                // Convert to Item format
                craftingMatches.push({
                  name: item.name ?? 'Unknown',
                  ml: item.ml ?? 0,
                  quests: item.quests,
                  slot: 'Augment', // Use 'Augment' for slot
                  affixes: item.affixes || [],
                  type: slot, // Put the actual slot in type
                  url: item.name ? `/page/Item:${item.name.replace(/ /g, '_')}` : undefined // Add DDO wiki URL
                })
              }
            }
          }
        }
      }
    }
  }

  const allMatches = [...matches, ...craftingMatches]

  // Sort: exact matches first, then by minimum level descending, then by name
  return allMatches.sort((a, b) => {
    // Check if either has an exact match
    const aExact = (a.quests ?? []).some((q) => q.trim().toLowerCase() === normalizedQuestName)
    const bExact = (b.quests ?? []).some((q) => q.trim().toLowerCase() === normalizedQuestName)

    if (aExact !== bExact) return aExact ? -1 : 1

    // Sort by minimum level descending, then by name
    if (a.ml !== b.ml) return b.ml - a.ml
    return a.name.localeCompare(b.name)
  })
}
