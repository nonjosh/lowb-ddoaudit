import { fetchJsonWithCache } from './cache'
import { AREAS_JSON_URL, DDOAUDIT_JSON_CACHE_TTL_MS } from './constants'

// Locations not present in the upstream areas payload but known from in-game observation.
const HARDCODED_AREAS: { id: string; name: string; is_public: boolean; is_wilderness: boolean }[] = [
  { id: '1879301916', name: 'The Anniversary Celebration', is_public: true, is_wilderness: false },
  { id: '1879304731', name: 'Eveningstar Crafting Hall', is_public: true, is_wilderness: false },
]

/**
 * Corrections applied on top of upstream areas data (upstream errors).
 * Unlike HARDCODED_AREAS (fallback injection), these overwrite API records.
 * Remove an entry once upstream fixes it (see AGENTS.md > "Quests or areas missing from DDO Audit").
 */
const AREA_PATCHES: { id: string; is_public?: boolean; is_wilderness?: boolean }[] = [
  // 1879303679 is the dedicated area of the raid "Terror of the Demon Lords"
  // (quest id 1879303683), but upstream labels it as wilderness
  // "Vision of an Alternate History", which makes raid occupants group under
  // wilderness areas instead of the raid in the Characters panel.
  { id: '1879303679', is_wilderness: false },
]

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

  for (const a of HARDCODED_AREAS) {
    if (!(a.id in map)) {
      map[a.id] = a
    }
  }

  for (const patch of AREA_PATCHES) {
    const existing = map[patch.id]
    if (existing) {
      if (patch.is_public !== undefined) existing.is_public = patch.is_public
      if (patch.is_wilderness !== undefined) existing.is_wilderness = patch.is_wilderness
    }
  }

  areasByIdCache = { data: map, updatedAt: result.updatedAt }

  return map
}
