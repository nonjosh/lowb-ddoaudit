import { CraftingData, Item } from '@/api/ddoGearPlanner'
import questCatalystsData from '@/assets/questCatalysts.json'

export type QuestTier = 'heroic' | 'epic' | 'legendary'

interface QuestCatalystDefinition {
  baseItem: string
  heroicVariant: string | null
  legendaryVariant: string | null
  catalystType: string
  equipmentType: string
  dropSource: string
}

export interface QuestLootLookupOptions {
  questInfo?: {
    heroicLevel?: number | null
    epicLevel?: number | null
    level?: number | null
  } | null
  questLevelHint?: number | null
}

const QUEST_TIER_SUFFIX_RE = /\s+\((heroic|epic|legendary)\)$/i

export function stripQuestTierSuffix(questName: string): string {
  return questName.replace(QUEST_TIER_SUFFIX_RE, '').trim()
}

function normalizeQuestLookupName(questName: string): string {
  return stripQuestTierSuffix(questName)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const QUEST_CATALYSTS_BY_NAME = Object.fromEntries(
  Object.entries(questCatalystsData as Record<string, QuestCatalystDefinition[]>)
    .map(([questName, catalysts]) => [normalizeQuestLookupName(questName), catalysts]),
) as Record<string, QuestCatalystDefinition[]>

function getSourceQuestTier(questName: string): QuestTier | null {
  const match = questName.match(QUEST_TIER_SUFFIX_RE)
  if (!match) return null
  return match[1].toLowerCase() as QuestTier
}

export function getRequestedQuestTier(
  questName: string,
  questLevelHint?: number | null,
  questInfo?: QuestLootLookupOptions['questInfo'],
): QuestTier | null {
  const explicitMatch = questName.match(QUEST_TIER_SUFFIX_RE)
  if (explicitMatch) {
    return explicitMatch[1].toLowerCase() as QuestTier
  }

  if (typeof questLevelHint === 'number') {
    const heroicLevel = questInfo?.heroicLevel
    const epicLevel = questInfo?.epicLevel

    if (typeof heroicLevel === 'number' && typeof epicLevel === 'number') {
      if (questLevelHint === heroicLevel) return 'heroic'
      if (questLevelHint === epicLevel) return epicLevel >= 30 ? 'legendary' : 'epic'
    }

    if (questLevelHint >= 30) return 'legendary'
    if (questLevelHint >= 20) return 'epic'
    if (questLevelHint > 0) return 'heroic'
  }

  return null
}

function isQuestTierCompatible(requestedTier: QuestTier | null, sourceTier: QuestTier | null): boolean {
  if (!requestedTier) return true
  if (sourceTier === null) return true
  return sourceTier === requestedTier
}

function getItemQuestTier(item: Pick<Item, 'ml' | 'name'>): QuestTier {
  if (/^legendary\b/i.test(item.name) || item.ml >= 29) return 'legendary'
  if (/^epic\b/i.test(item.name) || item.ml >= 20) return 'epic'
  return 'heroic'
}

function getQuestLootLevel(requestedTier: QuestTier | null, options: QuestLootLookupOptions): number | null {
  if (typeof options.questLevelHint === 'number') return options.questLevelHint

  if (requestedTier === 'heroic') {
    return options.questInfo?.heroicLevel ?? options.questInfo?.level ?? null
  }

  if (requestedTier === 'epic' || requestedTier === 'legendary') {
    return options.questInfo?.epicLevel ?? options.questInfo?.level ?? null
  }

  return options.questInfo?.level ?? null
}

function shouldUseLegendaryCatalystName(requestedTier: QuestTier | null, questLevel: number | null): boolean {
  if (requestedTier === 'epic' || requestedTier === 'legendary') return true
  if (requestedTier === 'heroic') return false
  return typeof questLevel === 'number' && questLevel >= 20
}

function buildItemWikiUrl(itemName: string): string {
  const pageName = `Item:${itemName}`.replace(/\s+/g, '_')
  return `/page/${encodeURIComponent(pageName).replace(/%3A/g, ':')}`
}

function buildCatalystCraftingWikiUrl(baseItem: string, questName: string): string {
  return `/page/Catalyst_Crafting#:~:text=${encodeURIComponent(baseItem)},${encodeURIComponent(questName)}`
}

function isCatalystItem(item: Pick<Item, 'slot'>): boolean {
  return item.slot === 'Catalyst'
}

function isCatalystTierCompatible(requestedTier: QuestTier, item: Pick<Item, 'name'>): boolean {
  const isLegendaryCatalyst = /^legendary\b/i.test(item.name)
  if (requestedTier === 'heroic') return !isLegendaryCatalyst
  return isLegendaryCatalyst
}

function getCatalystItemsForQuest(
  questName: string,
  requestedTier: QuestTier | null,
  options: QuestLootLookupOptions,
): Item[] {
  const catalysts = QUEST_CATALYSTS_BY_NAME[normalizeQuestLookupName(questName)] ?? []
  if (catalysts.length === 0) return []

  const questLevel = getQuestLootLevel(requestedTier, options)
  const useLegendaryName = shouldUseLegendaryCatalystName(requestedTier, questLevel)

  return catalysts
    .map(({ baseItem, heroicVariant, legendaryVariant, catalystType, equipmentType, dropSource }) => {
      const prefix = useLegendaryName ? 'Legendary ' : ''
      const name = `${prefix}${catalystType} Catalyst: ${baseItem}`

      return {
        name,
        ml: questLevel ?? (useLegendaryName ? 20 : 1),
        slot: 'Catalyst',
        type: 'Catalyst',
        affixes: [],
        catalystInfo: {
          catalystType,
          equipmentType,
          dropSource,
          heroicVariant,
          legendaryVariant,
          heroicVariantUrl: heroicVariant ? buildItemWikiUrl(heroicVariant) : null,
          legendaryVariantUrl: legendaryVariant ? buildItemWikiUrl(legendaryVariant) : null,
        },
        url: buildCatalystCraftingWikiUrl(baseItem, questName),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function matchesQuestSource(
  sourceQuestName: string,
  normalizedRequestedQuestName: string,
  requestedTier: QuestTier | null,
): boolean {
  if (normalizeQuestLookupName(sourceQuestName) !== normalizedRequestedQuestName) {
    return false
  }

  return isQuestTierCompatible(requestedTier, getSourceQuestTier(sourceQuestName))
}

/**
 * Find items that drop from a specific quest
 * @param items The array of items to search in
 * @param questName The quest name to search for
 * @param craftingData The crafting data to also search for augments
 * @param options Quest lookup hints for heroic/epic/legendary variants
 * @returns Array of items that drop from that quest
 */
export function getItemsForQuest(
  items: Item[],
  questName: string,
  craftingData?: CraftingData | null,
  options: QuestLootLookupOptions = {},
): Item[] {
  if (!questName) return []

  const normalizedQuestName = normalizeQuestLookupName(questName)
  const requestedTier = getRequestedQuestTier(questName, options.questLevelHint, options.questInfo)

  const matches = items.filter((item) => {
    if (!item.quests || !Array.isArray(item.quests)) return false

    return item.quests.some((q) => {
      return matchesQuestSource(q, normalizedQuestName, requestedTier)
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
              const hasQuest = item.quests.some((q: string) =>
                matchesQuestSource(q, normalizedQuestName, requestedTier),
              )
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

  const catalystMatches = getCatalystItemsForQuest(questName, requestedTier, options)

  const allMatches = [...matches, ...craftingMatches, ...catalystMatches]
  const tierFilteredMatches = requestedTier
    ? allMatches.filter((item) => {
      if (isCatalystItem(item)) {
        return isCatalystTierCompatible(requestedTier, item)
      }

      return getItemQuestTier(item) === requestedTier
    })
    : allMatches

  // Sort: exact matches first, then by minimum level descending, then by name
  return tierFilteredMatches.sort((a, b) => {
    // Check if either has an exact match
    const aExact = (a.quests ?? []).some((q) => matchesQuestSource(q, normalizedQuestName, requestedTier))
    const bExact = (b.quests ?? []).some((q) => matchesQuestSource(q, normalizedQuestName, requestedTier))

    if (aExact !== bExact) return aExact ? -1 : 1

    // Sort by minimum level descending, then by name
    if (a.ml !== b.ml) return b.ml - a.ml
    return a.name.localeCompare(b.name)
  })
}
