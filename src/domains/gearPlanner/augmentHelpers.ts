import type { CraftingData, Item } from '@/api/ddoGearPlanner'

/**
 * Augment slot types that should be extracted as searchable items.
 * These correspond to the keys in crafting.json that contain slot-based augments.
 */
const AUGMENT_SLOT_TYPES = [
  'Blue Augment Slot',
  'Red Augment Slot',
  'Yellow Augment Slot',
  'Green Augment Slot',
  'Purple Augment Slot',
  'Orange Augment Slot',
  'Colorless Augment Slot',
  'Moon Augment Slot',
  'Sun Augment Slot',
]

/**
 * Extracts augment data from crafting.json and converts them into Item-like objects
 * that can be displayed in the Item Wiki alongside regular items.
 *
 * Augments are stored in crafting.json under keys like "Blue Augment Slot",
 * with a "*" subkey containing an array of CraftingOption objects.
 *
 * @param craftingData The crafting data from the API
 * @returns Array of Item objects representing augments
 */
export function extractAugmentsAsItems(craftingData: CraftingData | null): Item[] {
  if (!craftingData) return []

  const augmentItems: Item[] = []

  for (const slotType of AUGMENT_SLOT_TYPES) {
    const slotData = craftingData[slotType]
    if (!slotData) continue

    // The "*" key contains universal options for this augment slot type
    const options = slotData['*']
    if (!Array.isArray(options)) continue

    for (const option of options) {
      // Skip options without name or affixes (like empty slot options)
      if (!option.name && (!option.affixes || option.affixes.length === 0)) {
        continue
      }

      // Generate a name if not provided
      const name = option.name || generateAugmentName(option.affixes || [])
      if (!name) continue

      const item: Item = {
        name,
        ml: option.ml ?? 1,
        slot: 'Augment',
        type: slotType,
        affixes: option.affixes || [],
        quests: option.quests,
        sets: option.set ? [option.set] : undefined,
        // Augments don't have crafting slots themselves
        crafting: undefined,
        url: undefined,
        artifact: false,
      }

      augmentItems.push(item)
    }
  }

  return augmentItems
}

/**
 * Generates a name for an augment based on its affixes when no name is provided.
 */
function generateAugmentName(affixes: { name: string; value?: string | number; type?: string }[]): string {
  if (affixes.length === 0) return ''

  // Use the first affix to generate a name
  const firstAffix = affixes[0]
  let name = firstAffix.name
  if (firstAffix.value && firstAffix.value !== 1 && firstAffix.value !== '1') {
    name += ` +${firstAffix.value}`
  }
  if (firstAffix.type && firstAffix.type !== 'bool') {
    name += ` (${firstAffix.type})`
  }
  return name
}

/**
 * Gets the display color for an augment type.
 */
export function getAugmentTypeColor(augmentType: string): string | undefined {
  const lower = augmentType.toLowerCase()
  if (lower.includes('blue')) return '#2196f3'
  if (lower.includes('red')) return '#f44336'
  if (lower.includes('yellow')) return '#ffeb3b'
  if (lower.includes('green')) return '#4caf50'
  if (lower.includes('purple')) return '#9c27b0'
  if (lower.includes('orange')) return '#ff9800'
  if (lower.includes('colorless')) return '#e0e0e0'
  if (lower.includes('moon')) return '#b0bec5'
  if (lower.includes('sun')) return '#ffc107'
  return undefined
}
