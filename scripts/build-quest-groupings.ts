#!/usr/bin/env npx tsx
/* eslint-disable no-undef */
/**
 * Rebuilds src/data/questGroupings.json, the cached quest -> saga / adventure pack map
 * used by the Adventure Log grouping.
 *
 * Usage: npx tsx scripts/build-quest-groupings.ts
 *
 * Sources:
 * - https://api.ddoaudit.com/v1/quests        (quest ids, names, required_adventure_pack)
 * - src/data/sagas.json                       (saga -> quest names, hand-curated)
 * - https://ddowiki.com/page/Saga             (reference for saga membership)
 * - https://ddowiki.com/page/Adventure_Pack   (reference for pack membership)
 *
 * The page prefers this snapshot and falls back to the live API field for quests that
 * were released after the snapshot was taken. Re-run after adding a saga or a new pack.
 */

import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(process.cwd(), 'src', 'data')
const SAGAS_PATH = path.join(DATA_DIR, 'sagas.json')
const OUTPUT_PATH = path.join(DATA_DIR, 'questGroupings.json')
const QUESTS_URL = 'https://api.ddoaudit.com/v1/quests?force=false'
const AREAS_URL = 'https://api.ddoaudit.com/v1/areas?force=false'

/** Areas upstream mislabels as wilderness; keep in sync with AREA_PATCHES. */
const FORCED_QUEST_AREAS = new Set(['1879303679'])

/** Case, articles and punctuation do not change which quest a name refers to. */
function normalizeQuestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const SAGA_BUCKETS = ['heroic', 'epic', 'legendary'] as const

interface SagaRecord {
  id: string
  name: string
  quests: string[]
}

interface QuestRecord {
  id: string | number
  area_id?: string | number | null
  name?: string | null
  required_adventure_pack?: string | null
}

interface AreaRecord {
  id: string | number
  is_wilderness?: boolean
}

interface GroupingEntry {
  sagas?: string[]
  pack?: string
  /** Upstream lists adventure areas as quests; the page hides them. */
  wilderness?: boolean
}

async function main() {
  const response = await fetch(QUESTS_URL)
  if (!response.ok) throw new Error(`Failed to fetch quests (${response.status})`)

  const payload = (await response.json()) as { data?: QuestRecord[] } | QuestRecord[]
  const quests = Array.isArray(payload) ? payload : (payload.data ?? [])

  const areasResponse = await fetch(AREAS_URL)
  if (!areasResponse.ok) throw new Error(`Failed to fetch areas (${areasResponse.status})`)
  const areasPayload = (await areasResponse.json()) as { data?: AreaRecord[] } | AreaRecord[]
  const areas = Array.isArray(areasPayload) ? areasPayload : (areasPayload.data ?? [])
  const wildernessAreas = new Set(
    areas
      .filter((area) => area.is_wilderness === true)
      .map((area) => String(area.id))
      .filter((id) => !FORCED_QUEST_AREAS.has(id)),
  )

  const sagasData = JSON.parse(fs.readFileSync(SAGAS_PATH, 'utf8')) as Record<string, SagaRecord[]>

  // The wiki does not always spell a quest the way the API does ("A Mad Tea Party"
  // vs "Mad Tea Party", "Trial by Fury" vs "Trial By Fury"). Resolve exact names
  // first, then a normalized form, but only when it is unambiguous.
  const idsByName = new Map<string, string[]>()
  const idsByNormalizedName = new Map<string, string[]>()
  const addTo = (map: Map<string, string[]>, key: string, id: string) =>
    map.set(key, [...(map.get(key) ?? []), id])

  for (const quest of quests) {
    const id = quest.id === undefined || quest.id === null ? '' : String(quest.id)
    const name = (quest.name ?? '').trim()
    if (!id || !name) continue
    addTo(idsByName, name, id)
    addTo(idsByNormalizedName, normalizeQuestName(name), id)
  }

  const unique = (candidates: string[] | undefined): string | undefined =>
    candidates && candidates.length === 1 ? candidates[0] : undefined

  /**
   * Wiki title -> API quest id. Exact title first, then a normalized form, then the
   * same check with a leading "Return to " removed (the epic saga lists the epic
   * variant of quests the API stores under the base name). Every step requires a
   * single candidate, so a duplicate name is reported instead of guessed.
   */
  const resolveQuestId = (wikiName: string): string | undefined =>
    unique(idsByName.get(wikiName)) ??
    unique(idsByNormalizedName.get(normalizeQuestName(wikiName))) ??
    unique(idsByNormalizedName.get(normalizeQuestName(wikiName.replace(/^return to\s+/i, ''))))

  // A quest can legitimately sit in several sagas (heroic + legendary variants, and
  // some event sagas share quests), so keep every membership in bucket order.
  const sagasByQuestId = new Map<string, string[]>()
  const resolvedAliases = new Set<string>()
  const unresolvedNames = new Set<string>()
  let sagaCount = 0

  for (const bucket of SAGA_BUCKETS) {
    const sagas = sagasData[bucket] ?? []
    sagaCount = Math.max(sagaCount, sagas.length)
    for (const saga of sagas) {
      for (const questName of saga.quests) {
        const questId = resolveQuestId(questName)
        if (!questId) {
          unresolvedNames.add(questName)
          continue
        }
        if (!idsByName.has(questName)) resolvedAliases.add(questName)

        const names = sagasByQuestId.get(questId) ?? []
        if (!names.includes(saga.name)) names.push(saga.name)
        sagasByQuestId.set(questId, names)
      }
    }
  }

  // Saga version comes from its level range: two legendary sagas are named "(Epic)".
  const sagaBands: Record<string, 'heroic' | 'epic' | 'legendary'> = {}
  for (const bucket of SAGA_BUCKETS) {
    for (const saga of sagasData[bucket] ?? []) {
      const level = Number.parseInt(String(saga.levelRange ?? ''), 10)
      sagaBands[saga.name] = Number.isFinite(level)
        ? level >= 30
          ? 'legendary'
          : level >= 20
            ? 'epic'
            : 'heroic'
        : bucket
    }
  }

  const questsMap: Record<string, GroupingEntry> = {}
  const packs = new Set<string>()
  let withSaga = 0
  let wilderness = 0

  for (const quest of quests) {
    const id = quest.id === undefined || quest.id === null ? '' : String(quest.id)
    if (!id) continue

    const entry: GroupingEntry = {}
    const sagas = sagasByQuestId.get(id)
    if (sagas && sagas.length > 0) {
      entry.sagas = sagas
      withSaga += 1
    }
    const pack = (quest.required_adventure_pack ?? '').trim()
    if (pack) {
      entry.pack = pack
      packs.add(pack)
    }

    const areaId = quest.area_id === null || quest.area_id === undefined ? '' : String(quest.area_id)
    if (areaId && wildernessAreas.has(areaId)) {
      entry.wilderness = true
      wilderness += 1
    }

    if (entry.sagas || entry.pack || entry.wilderness) questsMap[id] = entry
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sources: {
      quests: 'https://api.ddoaudit.com/v1/quests',
      sagas: 'src/data/sagas.json',
      wikiSaga: 'https://ddowiki.com/page/Saga',
      wikiPacks: 'https://ddowiki.com/page/Adventure_Pack',
    },
    sagaBands,
    counts: {
      quests: Object.keys(questsMap).length,
      questsWithSaga: withSaga,
      wilderness,
      packs: packs.size,
      sagasInSource: sagaCount,
    },
    quests: questsMap,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  if (resolvedAliases.size > 0) {
    console.log(`Resolved ${resolvedAliases.size} wiki name(s) by normalized match:`)
    for (const name of [...resolvedAliases].sort()) console.log(`  ${name}`)
  }
  if (unresolvedNames.size > 0) {
    console.warn(`${unresolvedNames.size} saga quest name(s) are absent from the API and were skipped:`)
    for (const name of [...unresolvedNames].sort()) console.warn(`  ${name}`)
  }

  console.log(
    `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}: ` +
      `${output.counts.quests} quests, ${withSaga} in a saga, ${wilderness} wilderness areas, ${packs.size} packs`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
