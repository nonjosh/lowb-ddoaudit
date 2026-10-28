#!/usr/bin/env npx tsx
/* eslint-disable no-undef */
/**
 * Rebuilds src/data/sagas.json from the DDO Wiki "Saga" page.
 *
 * Usage: npx tsx scripts/update-sagas.ts
 *
 * ddowiki.com blocks automated requests, so the page is read through the Jina
 * reader proxy. Data comes from the "Sagas by Quest Name" tables (the quest x saga
 * matrix) plus the per-bucket saga list for level range and adventure packs.
 *
 * Ambiguous ambiguous column layout is avoided by reading the header row of each
 * matrix; if the wiki changes its tables this script fails loudly instead of
 * writing a wrong file.
 */

import * as fs from 'fs'
import * as path from 'path'

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'sagas.json')
const WIKI_URL = 'https://r.jina.ai/https://ddowiki.com/page/Saga'

const BUCKET_BY_HEADING: Record<string, 'heroic' | 'epic' | 'legendary'> = {
  'Heroic (levels 1-12)': 'heroic',
  'Heroic (levels 13-19)': 'heroic',
  Epic: 'epic',
  Legendary: 'legendary',
}

interface SagaRecord {
  id: string
  name: string
  levelRange: string
  questCount: number
  adventurePacks: string[]
  quests: string[]
}

interface SagaMeta {
  name: string
  bucket: 'heroic' | 'epic' | 'legendary'
  levelRange: string
  adventurePacks: string[]
}

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Link text of a table cell. The reader proxy occasionally splits a long header
 * across two links ("The Planes-" + "walker's Path (Epic)"), so join every link in
 * the cell and drop the hyphen the split introduced.
 */
const linkText = (cell: string): string => {
  const links = [...cell.matchAll(/\[([^\]]+)\]\(/g)].map((match) => match[1])
  if (links.length === 0) return cell.replace(/\|/g, '').trim()
  if (links.length === 1) return links[0]
  return links.map((text, index) => (index < links.length - 1 ? text.replace(/-\s*$/, '') : text)).join('')
}

function parseMatrix(lines: string[]): Map<string, { bucket: 'heroic' | 'epic' | 'legendary'; quests: Set<string> }> {
  const sagas = new Map<string, { bucket: 'heroic' | 'epic' | 'legendary'; quests: Set<string> }>()
  let bucket: 'heroic' | 'epic' | 'legendary' | null = null
  let columns: string[] | null = null

  for (const line of lines) {
    const heading = /^### (.+?)\[\[edit/.exec(line)
    if (heading) {
      bucket = BUCKET_BY_HEADING[heading[1].trim()] ?? null
      columns = null
      continue
    }
    if (/^## /.test(line)) {
      if (!/Sagas by Quest Name/.test(line)) bucket = null
      columns = null
      continue
    }
    if (!bucket || !line.startsWith('|')) continue

    if (/^\|\s*Quest Name\s*\|/.test(line)) {
      columns = line
        .split('|')
        .slice(3)
        .map((cell) => linkText(cell))
        .filter(Boolean)
      continue
    }

    if (!columns) continue
    if (/Saga\/ Reward Giver/.test(line) || /^\|[\s|-]+\|?$/.test(line)) continue

    const cells = line.split('|').slice(1, -1)
    const questName = linkText(cells[0] ?? '')
    if (!questName) continue

    const marks = cells.slice(2)
    columns.forEach((sagaName, index) => {
      if ((marks[index] ?? '').trim() !== 'Yes') return
      const entry = sagas.get(sagaName) ?? { bucket, quests: new Set<string>() }
      entry.quests.add(questName)
      sagas.set(sagaName, entry)
    })
  }

  return sagas
}

function parseMetadata(lines: string[]): Map<string, SagaMeta> {
  const metas = new Map<string, SagaMeta>()
  let bucket: 'heroic' | 'epic' | 'legendary' | null = null

  for (const line of lines) {
    const heading = /^### (Heroic Sagas|Epic Sagas|Legendary Sagas)/.exec(line)
    if (heading) {
      bucket = heading[1].startsWith('Heroic') ? 'heroic' : heading[1].startsWith('Epic') ? 'epic' : 'legendary'
      continue
    }
    if (/^## /.test(line)) {
      bucket = null
      continue
    }
    if (!bucket) continue

    const bullet = /^\*\s+\[([^\]]+)\]\([^)]+\)\s*(.*)$/.exec(line)
    if (!bullet) continue

    const name = bullet[1]
    const rest = bullet[2]
    const level = /levels?\s+([0-9]+(?:\s*[–-]\s*[0-9]+)?)/i.exec(rest)
    const levelRange = level ? level[1].replace(/\s*[–-]\s*/, '–') : ''
    const adventurePacks = [...rest.matchAll(/\[([^\]]+)\]\(https:\/\/ddowiki\.com\/page\//g)]
      .map((match) => match[1])
      .filter((pack) => pack !== name)

    metas.set(name, { name, bucket, levelRange, adventurePacks })
  }

  return metas
}

async function main() {
  const response = await fetch(WIKI_URL, { headers: { accept: 'text/plain' } })
  if (!response.ok) throw new Error(`Wiki fetch failed (${response.status})`)
  const markdown = await response.text()
  const lines = markdown.split('\n')

  const matrix = parseMatrix(lines)
  const metas = parseMetadata(lines)
  if (matrix.size === 0) throw new Error('No sagas parsed from the quest matrix — wiki layout changed')

  const buckets: Record<'heroic' | 'epic' | 'legendary', SagaRecord[]> = { heroic: [], epic: [], legendary: [] }
  const missingMeta: string[] = []

  for (const [name, entry] of matrix) {
    const meta =
      metas.get(name) ??
      [...metas.values()].find(
        (candidate) => candidate.name.replace(/\s*\((Heroic|Epic|Legendary)\)$/i, '') === name.replace(/\s*\((Heroic|Epic|Legendary)\)$/i, ''),
      )
    if (!meta) missingMeta.push(name)

    const quests = [...entry.quests].sort((left, right) => left.localeCompare(right))
    buckets[meta?.bucket ?? entry.bucket].push({
      id: slug(name),
      name,
      levelRange: meta?.levelRange ?? '',
      questCount: quests.length,
      adventurePacks: meta?.adventurePacks ?? [],
      quests,
    })
  }

  for (const bucket of Object.keys(buckets) as Array<keyof typeof buckets>) {
    buckets[bucket].sort((left, right) => left.name.localeCompare(right.name))
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(buckets, null, 2)}\n`)

  const total = Object.values(buckets).reduce((sum, list) => sum + list.length, 0)
  console.log(
    `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}: heroic ${buckets.heroic.length}, epic ${buckets.epic.length}, ` +
      `legendary ${buckets.legendary.length} (${total} sagas)`,
  )
  if (missingMeta.length > 0) {
    console.warn(`Sagas in the matrix without a metadata entry: ${missingMeta.join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
