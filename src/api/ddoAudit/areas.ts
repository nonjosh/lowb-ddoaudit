import { AREAS_JSON_URL } from './constants';

// Locations not present in the upstream areas.json but known from in-game observation.
const HARDCODED_AREAS: { id: string; name: string; is_public: boolean; is_wilderness: boolean }[] = [
  { id: '1879301916', name: 'The Anniversary Celebration', is_public: true, is_wilderness: false },
];

let areasByIdPromise: Promise<Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>> | null = null

export async function fetchAreasById(): Promise<Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>> {
  if (areasByIdPromise) return areasByIdPromise

  areasByIdPromise = (async () => {
    const resp = await fetch(AREAS_JSON_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch areas.json (${resp.status})`)
    }

    const data = await resp.json()
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

    return map
  })()

  return areasByIdPromise
}
