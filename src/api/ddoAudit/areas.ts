import { fetchJsonWithCache } from './cache'
import { AREAS_JSON_URL, DDOAUDIT_JSON_CACHE_TTL_MS } from './constants'

/**
 * Corrections and additions applied on top of the upstream areas payload: a matching
 * record has the listed fields overwritten, and an area upstream omits is seeded from
 * its entry (flags default to `false`), so a new location shows its real name before
 * the API catches up.
 * Remove an entry once upstream carries correct data (see AGENTS.md > "Quests or areas missing from DDO Audit").
 */
export const PATCHED_AREAS: Array<{ id: string; name?: string; is_public?: boolean; is_wilderness?: boolean }> = [
  { id: '1879304731', name: 'Eveningstar Crafting Hall', is_public: true, is_wilderness: false },
  // 1879303679 is the dedicated area of the raid "Terror of the Demon Lords"
  // (quest id 1879303683), but upstream labels it as wilderness
  // "Vision of an Alternate History", which makes raid occupants group under
  // wilderness areas instead of the raid in the Characters panel.
  { id: '1879303679', is_wilderness: false },
  { id: '1879303681', name: 'Return to Castle Ravenloft', is_public: false, is_wilderness: false },
]

/** Instanced quest areas upstream may call wilderness; the poller keeps its own copy in `server/src/detect.ts`. */
export const FORCED_QUEST_AREA_IDS = new Set(
  PATCHED_AREAS
    .filter((patch) => patch.is_wilderness === false && patch.is_public !== true)
    .map((patch) => patch.id),
)

const AREAS_CACHE_KEY = 'ddoaudit:areas'

export interface AreaResponseItem {
  id?: string | number | null
  name?: string | null
  is_public?: boolean | null
  is_wilderness?: boolean | null
}

type AreasApiResponse = { data?: AreaResponseItem[] } | AreaResponseItem[]

export async function fetchAreasResponse() {
  return fetchJsonWithCache<AreasApiResponse>(
    AREAS_CACHE_KEY,
    async () => {
      const resp = await fetch(AREAS_JSON_URL)
      if (!resp.ok) {
        throw new Error(`Failed to fetch areas (${resp.status})`)
      }

      return await resp.json()
    }
  )
}

let areasByIdCache: {
  data: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  updatedAt: number | null
} | null = null

export async function fetchAreasById(): Promise<Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>> {
  const cachedAreas = areasByIdCache
  if (cachedAreas && cachedAreas.updatedAt !== null && Date.now() - cachedAreas.updatedAt <= DDOAUDIT_JSON_CACHE_TTL_MS) {
    return cachedAreas.data
  }

  const result = await fetchAreasResponse()

  const data = result.data
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

  const map: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }> = {}

  for (const a of list) {
    const id = String(a?.id ?? '').trim()
    const name = String(a?.name ?? '').trim()
    if (!id || id.toLowerCase() === 'null' || id === '0') continue
    if (!name) continue
    map[id] = {
      id,
      name,
      is_public: !!a?.is_public,
      is_wilderness: !!a?.is_wilderness,
    }
  }

  for (const patch of PATCHED_AREAS) {
    const existing = map[patch.id]
    if (existing) {
      if (patch.name !== undefined) existing.name = patch.name
      if (patch.is_public !== undefined) existing.is_public = patch.is_public
      if (patch.is_wilderness !== undefined) existing.is_wilderness = patch.is_wilderness
    } else if (patch.name !== undefined) {
      map[patch.id] = {
        id: patch.id,
        name: patch.name,
        is_public: patch.is_public ?? false,
        is_wilderness: patch.is_wilderness ?? false,
      }
    }
  }

  areasByIdCache = { data: map, updatedAt: result.updatedAt }

  return map
}
