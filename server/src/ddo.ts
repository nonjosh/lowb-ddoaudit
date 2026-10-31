import { catalogTtlMs, config } from './config.js'

export interface QuestRecord {
  id: string
  name: string
  areaId: string
  heroicCr: number | null
  epicCr: number | null
}

export interface Catalog {
  byArea: Map<string, QuestRecord[]>
  questById: Map<string, QuestRecord>
  areaIsWilderness: Map<string, boolean>
  areaIsPublic: Map<string, boolean>
}

export interface CharacterObservation {
  characterId: string
  online: boolean
  areaId: string | null
  level: number | null
  updatedAt: string | null
  /** True when upstream simply omitted the id; one omission is not a logout. */
  missing?: boolean
}

interface RawQuest {
  id?: string | number
  area_id?: string | number | null
  name?: string | null
  heroic_normal_cr?: string | number | null
  epic_normal_cr?: string | number | null
}

interface RawArea {
  id?: string | number
  is_wilderness?: boolean
  is_public?: boolean
}

interface RawCharacter {
  id?: string | number
  total_level?: number | null
  location_id?: string | number | null
  is_online?: boolean
  last_update?: string | null
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  const data = (payload as { data?: unknown } | null)?.data
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') return Object.values(data) as T[]
  return []
}

const UPSTREAM_TIMEOUT_MS = 15_000

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${config.ddoApiBaseUrl}${path}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`DDO Audit request failed: ${path} (${response.status})`)
  return response.json()
}

/**
 * Upstream reports a heroic CR for these legendary-only raids while every heroic XP
 * field is null. Left alone, the poller files runs under `{questId}:heroic`, a row the
 * page no longer renders. Keep in sync with `QUEST_PATCHES` in
 * `src/api/ddoAudit/quests.ts`.
 */
const LEGENDARY_ONLY_RAID_IDS = new Set(['1879260120', '1879260123', '1879273037', '1879283292'])

export function buildCatalog(rawQuests: RawQuest[], rawAreas: RawArea[]): Catalog {
  const byArea = new Map<string, QuestRecord[]>()
  const questById = new Map<string, QuestRecord>()

  for (const raw of rawQuests) {
    const id = raw.id === null || raw.id === undefined ? '' : String(raw.id)
    const areaId = raw.area_id === null || raw.area_id === undefined ? '' : String(raw.area_id)
    if (!id || !areaId) continue

    const quest: QuestRecord = {
      id,
      name: raw.name ?? id,
      areaId,
      heroicCr: LEGENDARY_ONLY_RAID_IDS.has(id) ? null : toNumber(raw.heroic_normal_cr),
      epicCr: toNumber(raw.epic_normal_cr),
    }

    questById.set(id, quest)
    const bucket = byArea.get(areaId)
    if (bucket) bucket.push(quest)
    else byArea.set(areaId, [quest])
  }

  const areaIsWilderness = new Map<string, boolean>()
  const areaIsPublic = new Map<string, boolean>()
  for (const raw of rawAreas) {
    if (raw.id === null || raw.id === undefined) continue
    const id = String(raw.id)
    areaIsWilderness.set(id, raw.is_wilderness === true)
    areaIsPublic.set(id, raw.is_public === true)
  }

  return { byArea, questById, areaIsWilderness, areaIsPublic }
}

let cached: { catalog: Catalog; expiresAt: number } | null = null

export async function getCatalog(): Promise<Catalog> {
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.catalog

  const [questsPayload, areasPayload] = await Promise.all([getJson('/quests'), getJson('/areas')])
  const catalog = buildCatalog(asArray<RawQuest>(questsPayload), asArray<RawArea>(areasPayload))

  // The resolver deliberately refuses areas it cannot classify, so surface the two
  // drift cases once per refresh instead of silently never recording those quests.
  // Wilderness areas with quest records are expected (~48) and are not reported.
  const questAreas = [...catalog.byArea.keys()]
  const missingFromFeed = questAreas.filter((areaId) => !catalog.areaIsPublic.has(areaId))
  const unexpectedPublic = questAreas.filter((areaId) => catalog.areaIsPublic.get(areaId) === true)
  if (missingFromFeed.length > 0) {
    console.warn(
      `catalog: ${missingFromFeed.length} quest area(s) missing from /areas, ignored: ${missingFromFeed.slice(0, 10).join(',')}`,
    )
  }
  if (unexpectedPublic.length > 0) {
    console.warn(
      `catalog: ${unexpectedPublic.length} quest area(s) flagged public, ignored: ${unexpectedPublic.slice(0, 10).join(',')}`,
    )
  }

  cached = { catalog, expiresAt: now + catalogTtlMs }
  return catalog
}

export async function fetchObservations(characterIds: string[]): Promise<CharacterObservation[]> {
  const observations: CharacterObservation[] = []
  const batchSize = 30

  for (let index = 0; index < characterIds.length; index += batchSize) {
    const batch = characterIds.slice(index, index + batchSize)
    const payload = await getJson(`/characters/ids/${batch.join(',')}`)
    // A degraded 200 (data null / unexpected shape) must abort the tick, not look
    // like "everyone logged off", which would close open visits.
    const container = payload as { data?: unknown } | null
    if (!container || typeof container.data !== 'object' || container.data === null) {
      throw new Error('Unexpected characters response shape')
    }
    const characters = asArray<RawCharacter>(payload)
    const byId = new Map<string, RawCharacter>()
    for (const character of characters) {
      if (character.id !== null && character.id !== undefined) byId.set(String(character.id), character)
    }

    for (const characterId of batch) {
      const character = byId.get(characterId)
      if (!character) {
        // Upstream omits logged-out (and hidden) characters, but a single omission
        // can also be a transient gap. Flag it and let the caller decide.
        observations.push({
          characterId,
          online: false,
          areaId: null,
          level: null,
          updatedAt: null,
          missing: true,
        })
        continue
      }
      const areaId = character.location_id === null || character.location_id === undefined
        ? null
        : String(character.location_id)
      observations.push({
        characterId,
        online: character.is_online === true,
        areaId,
        level: toNumber(character.total_level),
        updatedAt: character.last_update ?? null,
      })
    }
  }

  return observations
}
