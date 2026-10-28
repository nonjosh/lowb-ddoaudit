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

const SAGA_BUCKETS = ['heroic', 'epic', 'legendary'] as const

interface SagaRecord {
  id: string
  name: string
  quests: string[]
}

interface QuestRecord {
  id: string | number
  name?: string | null
  required_adventure_pack?: string | null
}

interface GroupingEntry {
  saga?: string
  pack?: string
}

async function main() {
  const response = await fetch(QUESTS_URL)
  if (!response.ok) throw new Error(`Failed to fetch quests (${response.status})`)

  const payload = (await response.json()) as { data?: QuestRecord[] } | QuestRecord[]
  const quests = Array.isArray(payload) ? payload : (payload.data ?? [])

  const sagasData = JSON.parse(fs.readFileSync(SAGAS_PATH, 'utf8')) as Record<string, SagaRecord[]>

  // Same precedence as the app: heroic, then epic, then legendary.
  const sagaByQuestName = new Map<string, string>()
  let sagaCount = 0
  for (const bucket of SAGA_BUCKETS) {
    const sagas = sagasData[bucket] ?? []
    sagaCount = Math.max(sagaCount, sagas.length)
    for (const saga of sagas) {
      for (const questName of saga.quests) {
        if (!sagaByQuestName.has(questName)) sagaByQuestName.set(questName, saga.name)
      }
    }
  }

  const questsMap: Record<string, GroupingEntry> = {}
  const packs = new Set<string>()
  let withSaga = 0

  for (const quest of quests) {
    const id = quest.id === undefined || quest.id === null ? '' : String(quest.id)
    if (!id) continue

    const entry: GroupingEntry = {}
    const name = (quest.name ?? '').trim()
    const saga = name ? sagaByQuestName.get(name) : undefined
    if (saga) {
      entry.saga = saga
      withSaga += 1
    }
    const pack = (quest.required_adventure_pack ?? '').trim()
    if (pack) {
      entry.pack = pack
      packs.add(pack)
    }

    if (entry.saga || entry.pack) questsMap[id] = entry
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sources: {
      quests: 'https://api.ddoaudit.com/v1/quests',
      sagas: 'src/data/sagas.json',
      wikiSaga: 'https://ddowiki.com/page/Saga',
      wikiPacks: 'https://ddowiki.com/page/Adventure_Pack',
    },
    counts: {
      quests: Object.keys(questsMap).length,
      questsWithSaga: withSaga,
      packs: packs.size,
      sagasInSource: sagaCount,
    },
    quests: questsMap,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(
    `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}: ` +
      `${output.counts.quests} quests, ${withSaga} in a saga, ${packs.size} packs`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
