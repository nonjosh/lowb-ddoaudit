import { CraftingData, CraftingOption } from '@/api/ddoGearPlanner/crafting'
import { Item } from '@/api/ddoGearPlanner/items'

import { GearCraftingSelections } from './craftingHelpers'
import { GearSetup } from './gearSetup'

const DDO_GEAR_PLANNER_BASE = 'https://ddo-gear-planner.netlify.app/#/main'

/**
 * Mapping from external ddo-gear-planner URL slot names to our internal GearSetup keys
 */
const URL_SLOT_TO_SETUP_KEY: Record<string, keyof GearSetup> = {
  Weapon: 'mainHand',
  Offhand: 'offHand',
  Armor: 'armor',
  Belt: 'belt',
  Boots: 'boots',
  Bracers: 'bracers',
  Cloak: 'cloak',
  Gloves: 'gloves',
  Goggles: 'goggles',
  Helm: 'helm',
  Necklace: 'necklace',
  Ring1: 'ring1',
  Ring2: 'ring2',
  Trinket: 'trinket',
}

/**
 * Reverse mapping: our internal GearSetup keys to external URL slot names
 */
const SETUP_KEY_TO_URL_SLOT: Record<keyof GearSetup, string> = {
  mainHand: 'Weapon',
  offHand: 'Offhand',
  armor: 'Armor',
  belt: 'Belt',
  boots: 'Boots',
  bracers: 'Bracers',
  cloak: 'Cloak',
  gloves: 'Gloves',
  goggles: 'Goggles',
  helm: 'Helm',
  necklace: 'Necklace',
  ring1: 'Ring1',
  ring2: 'Ring2',
  trinket: 'Trinket',
}

/**
 * Mapping from external craft slot names to our internal GearSetup key names
 * External uses PascalCase (Bracers, Ring2, etc.), internal uses camelCase (bracers, ring2, etc.)
 */
const CRAFT_SLOT_TO_SETUP_KEY: Record<string, string> = {
  Weapon: 'mainHand',
  Offhand: 'offHand',
  Armor: 'armor',
  Belt: 'belt',
  Boots: 'boots',
  Bracers: 'bracers',
  Cloak: 'cloak',
  Gloves: 'gloves',
  Goggles: 'goggles',
  Helm: 'helm',
  Necklace: 'necklace',
  Ring1: 'ring1',
  Ring2: 'ring2',
  Trinket: 'trinket',
}

/**
 * Reverse mapping for craft slots: internal key -> external PascalCase name
 */
const SETUP_KEY_TO_CRAFT_SLOT: Record<string, string> = Object.fromEntries(
  Object.entries(CRAFT_SLOT_TO_SETUP_KEY).map(([k, v]) => [v, k])
)

interface ParsedExternalUrl {
  /** Gear items by internal slot key */
  items: Partial<Record<keyof GearSetup, string>>
  /** Crafting selections: slot key -> array of { system, selected } */
  crafting: Record<string, { system: string; selected: string }[]>
  /** Tracked properties */
  trackedProperties: string[]
  /** Level range [min, max] */
  levelRange?: [number, number]
}

/**
 * Parse a ddo-gear-planner URL into structured data
 */
function parseExternalUrl(url: string): ParsedExternalUrl | null {
  try {
    // The URL uses hash-based routing: .../#/main?params
    // Extract the query string after the hash fragment
    const hashIndex = url.indexOf('#')
    if (hashIndex === -1) return null

    const hashPart = url.substring(hashIndex + 1)
    const queryIndex = hashPart.indexOf('?')
    if (queryIndex === -1) return null

    const queryString = hashPart.substring(queryIndex + 1)
    const params = new URLSearchParams(queryString)

    const result: ParsedExternalUrl = {
      items: {},
      crafting: {},
      trackedProperties: [],
    }

    // Parse level range
    const levelRange = params.get('levelrange')
    if (levelRange) {
      const parts = levelRange.split(',').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        result.levelRange = [parts[0], parts[1]]
      }
    }

    // Parse gear slots
    for (const [urlSlot, setupKey] of Object.entries(URL_SLOT_TO_SETUP_KEY)) {
      const itemName = params.get(urlSlot)
      if (itemName) {
        result.items[setupKey] = itemName
      }
    }

    // Parse crafting entries (craft_N_slot, craft_N_system, craft_N_selected)
    const craftingEntries = new Map<number, { slot?: string; system?: string; selected?: string }>()
    for (const [key, value] of params.entries()) {
      const match = key.match(/^craft_(\d+)_(slot|system|selected)$/)
      if (match) {
        const index = parseInt(match[1], 10)
        const field = match[2] as 'slot' | 'system' | 'selected'
        if (!craftingEntries.has(index)) {
          craftingEntries.set(index, {})
        }
        craftingEntries.get(index)![field] = value
      }
    }

    // Group crafting entries by slot
    for (const entry of craftingEntries.values()) {
      if (entry.slot && entry.system && entry.selected) {
        const internalSlot = CRAFT_SLOT_TO_SETUP_KEY[entry.slot] ?? entry.slot.toLowerCase()
        if (!result.crafting[internalSlot]) {
          result.crafting[internalSlot] = []
        }
        result.crafting[internalSlot].push({
          system: entry.system,
          selected: entry.selected,
        })
      }
    }

    // Parse tracked properties (multiple "tracked" params)
    const tracked = params.getAll('tracked')
    result.trackedProperties = tracked

    return result
  } catch {
    return null
  }
}

/**
 * Find a CraftingOption by matching system (slot type) and selected option name.
 *
 * The external URL's "system" field corresponds to our CraftingData key (the slot type),
 * and "selected" corresponds to the CraftingOption name.
 *
 * CraftingData structure: [SlotType] -> [ItemName|"*"] -> CraftingOption[]
 */
function findCraftingOption(
  craftingData: CraftingData,
  itemName: string,
  system: string,
  selectedName: string
): { slotType: string; option: CraftingOption } | null {
  // The "system" in the external URL maps to a crafting slot type key in craftingData
  // Try exact match first, then partial match
  const slotTypes = Object.keys(craftingData)

  // Find the matching slot type: try exact match, then startsWith match
  let matchedSlotType = slotTypes.find(st => st === system)
  if (!matchedSlotType) {
    // The external URL may truncate or slightly differ in naming
    // e.g., "Random set 1 (Legendary Vault of Night or Legendary Red Fens)" vs "Random set 1"
    matchedSlotType = slotTypes.find(st => system.startsWith(st) || st.startsWith(system))
  }
  if (!matchedSlotType) return null

  const slotData = craftingData[matchedSlotType]
  if (!slotData) return null

  // Look for options under the specific item name first, then under "*" (universal)
  const sources = [slotData[itemName], slotData['*']].filter(Boolean)

  for (const options of sources) {
    if (!options) continue
    // Try exact match on option name
    let found = options.find(opt => opt.name === selectedName)
    if (found) return { slotType: matchedSlotType, option: found }

    // Try case-insensitive match
    found = options.find(opt => opt.name?.toLowerCase() === selectedName.toLowerCase())
    if (found) return { slotType: matchedSlotType, option: found }
  }

  return null
}

export interface ImportResult {
  setup: GearSetup
  craftingSelections: GearCraftingSelections
  trackedProperties: string[]
  maxML?: number
  /** Items that couldn't be found by name */
  missingItems: string[]
  /** Crafting options that couldn't be matched */
  missingCrafting: { slot: string; system: string; selected: string }[]
}

/**
 * Import a gear setup from a ddo-gear-planner URL.
 *
 * @param url The full ddo-gear-planner URL
 * @param items All available items from the gear planner data
 * @param craftingData Crafting data for resolving augment/crafting selections
 * @returns ImportResult or null if the URL cannot be parsed
 */
export function importFromExternalUrl(
  url: string,
  items: Item[],
  craftingData: CraftingData | null
): ImportResult | null {
  const parsed = parseExternalUrl(url)
  if (!parsed) return null

  const itemsByName = new Map(items.map(item => [item.name, item]))
  const setup: GearSetup = {}
  const missingItems: string[] = []
  const missingCrafting: ImportResult['missingCrafting'] = []

  // Resolve items
  for (const [slotKey, itemName] of Object.entries(parsed.items)) {
    const item = itemsByName.get(itemName)
    if (item) {
      setup[slotKey as keyof GearSetup] = item
    } else {
      missingItems.push(itemName)
    }
  }

  // Resolve crafting selections
  const craftingSelections: GearCraftingSelections = {}

  if (craftingData) {
    // First, initialize crafting selections arrays for all equipped items that have crafting slots
    for (const [slotKey, item] of Object.entries(setup)) {
      if (item && (item as Item).crafting && (item as Item).crafting!.length > 0) {
        const typedItem = item as Item
        craftingSelections[slotKey] = typedItem.crafting!.map(slotType => ({
          slotType,
          option: null,
        }))
      }
    }

    // Now apply the parsed crafting entries
    for (const [slotKey, entries] of Object.entries(parsed.crafting)) {
      const item = setup[slotKey as keyof GearSetup]
      if (!item) continue

      // Ensure the slot has an initialized selections array
      if (!craftingSelections[slotKey]) {
        craftingSelections[slotKey] = (item.crafting ?? []).map(slotType => ({
          slotType,
          option: null,
        }))
      }

      for (const entry of entries) {
        const match = findCraftingOption(craftingData, item.name, entry.system, entry.selected)
        if (match) {
          // Find the correct index in the crafting slots for this system/slotType
          const slotIndex = craftingSelections[slotKey].findIndex(
            sel => sel.slotType === match.slotType && sel.option === null
          )
          if (slotIndex !== -1) {
            craftingSelections[slotKey][slotIndex] = {
              slotType: match.slotType,
              option: match.option,
            }
          }
        } else {
          missingCrafting.push({ slot: slotKey, system: entry.system, selected: entry.selected })
        }
      }
    }
  }

  return {
    setup,
    craftingSelections,
    trackedProperties: parsed.trackedProperties,
    maxML: parsed.levelRange ? parsed.levelRange[1] : undefined,
    missingItems,
    missingCrafting,
  }
}

/**
 * Export a gear setup to a ddo-gear-planner URL.
 *
 * @param setup The gear setup to export
 * @param craftingSelections The crafting selections for the gear setup
 * @param trackedProperties Properties being tracked (selected properties)
 * @param maxML Maximum item level
 * @returns The full ddo-gear-planner URL string
 */
export function exportToExternalUrl(
  setup: GearSetup,
  craftingSelections?: GearCraftingSelections,
  trackedProperties?: string[],
  maxML?: number
): string {
  const params = new URLSearchParams()

  // Level range
  params.set('levelrange', `1,${maxML ?? 34}`)
  params.set('raids', 'true')
  params.set('hiddentypes', '')

  // Gear slots
  for (const [setupKey, urlSlot] of Object.entries(SETUP_KEY_TO_URL_SLOT)) {
    const item = setup[setupKey as keyof GearSetup]
    if (item) {
      params.set(urlSlot, item.name)
    }
  }

  // Crafting selections
  let craftIndex = 0
  if (craftingSelections) {
    for (const [slotKey, selections] of Object.entries(craftingSelections)) {
      const externalSlot = SETUP_KEY_TO_CRAFT_SLOT[slotKey] ?? slotKey
      for (const sel of selections) {
        if (sel.option && sel.option.name) {
          params.set(`craft_${craftIndex}_slot`, externalSlot)
          params.set(`craft_${craftIndex}_system`, sel.slotType)
          params.set(`craft_${craftIndex}_selected`, sel.option.name)
          craftIndex++
        }
      }
    }
  }

  // Tracked properties
  if (trackedProperties) {
    for (const prop of trackedProperties) {
      params.append('tracked', prop)
    }
  }

  return `${DDO_GEAR_PLANNER_BASE}?${params.toString()}`
}

/**
 * Check if a string looks like a ddo-gear-planner URL
 */
export function isExternalGearPlannerUrl(text: string): boolean {
  return text.includes('ddo-gear-planner.netlify.app')
}

/**
 * Build a summary of found/missing items for user feedback after import
 */
export function formatImportSummary(result: ImportResult): string {
  const lines: string[] = []

  const itemCount = Object.values(result.setup).filter(Boolean).length
  lines.push(`Imported ${itemCount} items`)

  if (result.missingItems.length > 0) {
    lines.push(`Missing items: ${result.missingItems.join(', ')}`)
  }
  if (result.missingCrafting.length > 0) {
    lines.push(`Unresolved crafting: ${result.missingCrafting.map(c => `${c.selected} (${c.system})`).join(', ')}`)
  }

  return lines.join('\n')
}
