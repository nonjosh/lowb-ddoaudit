import { fetchJsonWithCache } from './cache'
import { DDOAUDIT_JSON_CACHE_TTL_MS, QUESTS_JSON_URL } from './constants'
import { parseNullableInt } from './helpers'

export interface Quest {
  id: string
  name: string
  type: string | null
  level: number | null
  heroicLevel: number | null
  epicLevel: number | null
  required_adventure_pack: string | null
  /** Favor faction the quest grants (e.g. "House Kundarak"). */
  patron: string | null
  areaId: string | null
}

const QUESTS_CACHE_KEY = 'ddoaudit:quests'

/**
 * Hardcoded quests that may not yet be in the DDO Audit API.
 * These are injected as fallback entries; once the API includes them,
 * the API data takes precedence because it overwrites the map keys.
 * Remove an entry once the API provides it (see AGENTS.md > "Quests or areas missing from DDO Audit").
 */
const HARDCODED_QUESTS: Array<{ id: string; name: string; type: string | null; level: number | null; areaId: string | null }> = []

/**
 * Quests whose upstream level data is wrong. The API reports a heroic CR for these
 * legendary-only raids while every heroic XP field is null, so the adventure log grew a
 * bogus heroic row (The Dryad and the Demigod showed up as a L19 raid). Drop an entry
 * once the API stops reporting `heroic_normal_cr` for that quest.
 */
const QUEST_PATCHES: Array<{ id: string; heroicLevel: number | null }> = [
  { id: '1879260120', heroicLevel: null }, // The Dryad and the Demigod, L32 legendary raid
  { id: '1879260123', heroicLevel: null }, // Hunt or Be Hunted, L32 legendary raid
  { id: '1879273037', heroicLevel: null }, // Skeletons in the Closet, L34 legendary raid
  { id: '1879283292', heroicLevel: null }, // Fire Over Morgrave, L34 legendary raid
]

export interface QuestResponseItem {
  id?: string | number | null
  area_id?: string | number | null
  name?: string | null
  group_size?: string | null
  heroic_normal_cr?: string | number | null
  epic_normal_cr?: string | number | null
  required_adventure_pack?: string | null
  patron?: string | null
}

type QuestsApiResponse = { data?: QuestResponseItem[] } | QuestResponseItem[]

export async function fetchQuestsResponse() {
  return fetchJsonWithCache<QuestsApiResponse>(
    QUESTS_CACHE_KEY,
    async () => {
      const resp = await fetch(QUESTS_JSON_URL)
      if (!resp.ok) {
        throw new Error(`Failed to fetch quests (${resp.status})`)
      }

      return await resp.json()
    }
  )
}

let questsByIdCache: { data: Record<string, Quest>; updatedAt: number | null } | null = null

export async function fetchQuestsById(): Promise<Record<string, Quest>> {
  const cachedQuests = questsByIdCache
  if (cachedQuests && cachedQuests.updatedAt !== null && Date.now() - cachedQuests.updatedAt <= DDOAUDIT_JSON_CACHE_TTL_MS) {
    return cachedQuests.data
  }

  const result = await fetchQuestsResponse()

  const data = result.data
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

  const map: Record<string, Quest> = {}

  for (const q of list) {
    const name = String(q?.name ?? '').trim()
    const type = String(q?.group_size ?? '').trim()
    const heroicCr = parseNullableInt(q?.heroic_normal_cr)
    const epicCr = parseNullableInt(q?.epic_normal_cr)
    const level = heroicCr === null && epicCr === null ? null : Math.max(heroicCr ?? 0, epicCr ?? 0)
    const pack = String(q?.required_adventure_pack ?? '').trim() || null
    const patron = String(q?.patron ?? '').trim() || null

    const primaryId = String(q?.id ?? '').trim()
    const areaId = String(q?.area_id ?? '').trim()
    const ids = new Set([primaryId, areaId].filter((x) => x && x.toLowerCase() !== 'null' && x !== '0'))

    if (!name || ids.size === 0) continue

    const questObj: Quest = {
      id: primaryId,
      name,
      type: type || null,
      level,
      heroicLevel: heroicCr,
      epicLevel: epicCr,
      required_adventure_pack: pack,
      patron,
      areaId: areaId && areaId.toLowerCase() !== 'null' && areaId !== '0' ? areaId : null,
    }

    for (const id of ids) {
      map[id] = questObj
    }
  }

  // Correct the level data upstream gets wrong. The quest object is shared by its id
  // and area id keys, so one mutation covers both.
  for (const patch of QUEST_PATCHES) {
    const quest = map[patch.id]
    if (!quest) continue
    quest.heroicLevel = patch.heroicLevel
    quest.level =
      quest.heroicLevel === null && quest.epicLevel === null
        ? null
        : Math.max(quest.heroicLevel ?? 0, quest.epicLevel ?? 0)
  }

  questsByIdCache = { data: map, updatedAt: result.updatedAt }

  // Inject hardcoded quests as fallbacks. If the API already includes them,
  // the API data will have overwritten these keys during the loop above.
  for (const hq of HARDCODED_QUESTS) {
    if (!map[hq.id]) {
      const questObj: Quest = {
        id: hq.id,
        name: hq.name,
        type: hq.type,
        level: hq.level,
        heroicLevel: null,
        epicLevel: null,
        required_adventure_pack: null,
        patron: null,
        areaId: hq.areaId,
      }
      map[hq.id] = questObj
      if (hq.areaId) map[hq.areaId] = questObj
    }
  }

  return map
}
