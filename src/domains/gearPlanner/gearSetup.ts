import { Item, ItemAffix, SetsData } from '@/api/ddoGearPlanner'

/**
 * Gear slots available in DDO
 */
export const GEAR_SLOTS = [
  'Armor',
  'Belt',
  'Boots',
  'Bracers',
  'Cloak',
  'Gloves',
  'Goggles',
  'Helm',
  'Necklace',
  'Ring',
  'Trinket',
  'Weapon',
  'Offhand'
] as const

export type GearSlot = typeof GEAR_SLOTS[number]

/**
 * Represents a complete gear setup
 */
export interface GearSetup {
  armor?: Item
  belt?: Item
  boots?: Item
  bracers?: Item
  cloak?: Item
  gloves?: Item
  goggles?: Item
  helm?: Item
  necklace?: Item
  ring1?: Item
  ring2?: Item
  trinket?: Item
  mainHand?: Item
  offHand?: Item
}

/**
 * Checks if an item fits a specific slot
 */
export function itemFitsSlot(item: Item, slot: GearSlot): boolean {
  if (slot === 'Ring') {
    return item.slot === 'Ring'
  }
  if (slot === 'Trinket') {
    return item.slot === 'Trinket'
  }
  if (slot === 'Weapon') {
    return item.slot === 'Weapon'
  }
  if (slot === 'Offhand') {
    return item.slot === 'Offhand'
  }
  return item.slot === slot
}

/**
 * Gets all affixes from a gear setup, including set bonuses
 * @param setup The gear setup
 * @param setsData Set bonus data
 * @param additionalSetMemberships Additional set memberships (e.g., from Set Augments)
 */
export function getGearAffixes(
  setup: GearSetup,
  setsData: SetsData | null,
  additionalSetMemberships: string[] = []
): ItemAffix[] {
  const allAffixes: ItemAffix[] = []
  const setItemCounts = new Map<string, number>()

  // Collect affixes from all items
  const items: (Item | undefined)[] = [
    setup.armor,
    setup.belt,
    setup.boots,
    setup.bracers,
    setup.cloak,
    setup.gloves,
    setup.goggles,
    setup.helm,
    setup.necklace,
    setup.ring1,
    setup.ring2,
    setup.trinket,
    setup.mainHand,
    setup.offHand
  ]

  // Count set items
  for (const item of items) {
    if (item?.sets) {
      for (const setName of item.sets) {
        setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
      }
    }
    if (item?.affixes) {
      allAffixes.push(...item.affixes)
    }
  }

  // Add additional set memberships from crafting (e.g., Set Augments)
  for (const setName of additionalSetMemberships) {
    setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
  }

  // Add set bonuses
  if (setsData) {
    for (const [setName, count] of setItemCounts.entries()) {
      const setBonuses = setsData[setName]
      if (setBonuses) {
        for (const bonus of setBonuses) {
          if (count >= bonus.threshold) {
            allAffixes.push(...bonus.affixes)
          }
        }
      }
    }
  }

  return allAffixes
}

/**
 * Filters items by slot
 */
export function getItemsBySlot(items: Item[], slot: GearSlot): Item[] {
  return items.filter(item => itemFitsSlot(item, slot))
}

/**
 * Gets the key for a gear slot in GearSetup
 */
export function getSlotKey(slot: GearSlot, index?: number): keyof GearSetup {
  if (slot === 'Ring') {
    return index === 1 ? 'ring2' : 'ring1'
  }
  if (slot === 'Weapon') {
    return 'mainHand'
  }
  if (slot === 'Offhand') {
    return 'offHand'
  }
  return slot.toLowerCase() as keyof GearSetup
}
