import { QUESTS_JSON_URL } from './constants'
import { parseNullableInt } from './helpers'

export interface Quest {
  id: string
  name: string
  type: string | null
  level: number | null
  heroicLevel: number | null
  epicLevel: number | null
  required_adventure_pack: string | null
  areaId: string | null
}

let questsByIdPromise: Promise<Record<string, Quest>> | null = null

export async function fetchQuestsById(): Promise<Record<string, Quest>> {
  if (questsByIdPromise) return questsByIdPromise

  questsByIdPromise = (async () => {
    const resp = await fetch(QUESTS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch quests.json (${resp.status})`)
    }

    const data = await resp.json()
    const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

    const map: Record<string, Quest> = {}

    for (const q of list) {
      const name = String(q?.name ?? '').trim()
      const type = String(q?.group_size ?? '').trim()
      const heroicCr = parseNullableInt(q?.heroic_normal_cr)
      const epicCr = parseNullableInt(q?.epic_normal_cr)
      const level = heroicCr === null && epicCr === null ? null : Math.max(heroicCr ?? 0, epicCr ?? 0)
      const pack = String(q?.required_adventure_pack ?? '').trim() || null

      const primaryId = String(q?.id ?? '').trim()
      const altId = String(q?.alt_id ?? '').trim()
      const areaId = String(q?.area_id ?? '').trim()
      const ids = new Set([primaryId, altId, areaId].filter((x) => x && x.toLowerCase() !== 'null' && x !== '0'))

      if (!name || ids.size === 0) continue

      const questObj: Quest = {
        id: primaryId,
        name,
        type: type || null,
        level,
        heroicLevel: heroicCr,
        epicLevel: epicCr,
        required_adventure_pack: pack,
        areaId: areaId && areaId.toLowerCase() !== 'null' && areaId !== '0' ? areaId : null,
      }

      for (const id of ids) {
        map[id] = questObj
      }
    }

    return map
  })()

  return questsByIdPromise
}
