#!/usr/bin/env npx tsx
/* eslint-disable no-undef */
/**
 * Rebuilds src/data/sagaCards.json: which Deck of Many Curses card type each saga
 * can award.
 *
 * Usage: npx tsx scripts/build-saga-cards.ts
 *
 * Source: https://ddowiki.com/page/Item:Deck_of_Many_Curses (read through the Jina
 * reader proxy, see .github/skills/ddo-wiki/SKILL.md). The page table is
 * `Card | Saga(s) | Normal | Hard | Elite | True Elite`.
 */

import * as fs from 'fs'
import * as path from 'path'

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'sagaCards.json')
const GROUPINGS_PATH = path.join(process.cwd(), 'src', 'data', 'questGroupings.json')
const WIKI_URL = 'https://r.jina.ai/https://ddowiki.com/page/Item:Deck_of_Many_Curses'

interface SagaCardsFile {
  generatedAt: string
  source: string
  cards: Record<string, string[]>
}

/** Same rule the page applies to saga labels: drop the band, the article, the case. */
function normalizeSagaName(name: string): string {
  return name
    .replace(/\s*\((heroic|epic|legendary)\)\s*$/i, '')
    .replace(/^the\s+/i, '')
    .trim()
    .toLowerCase()
}

/** Card rows look like: | Accursed Card | [Saga A](..) [Saga B](..) | 30 | 60 | 90 | 120 | */
function parseCardRows(markdown: string): Record<string, string[]> {
  const cards: Record<string, string[]> = {}

  for (const line of markdown.split('\n')) {
    if (!/^\|\s*[A-Za-z' ]+Card\s*\|/.test(line)) continue

    const cells = line.split('|').slice(1, -1)
    const card = (cells[0] ?? '').trim()
    const sagasCell = cells[1] ?? ''
    if (!card) continue

    const sagas = [...sagasCell.matchAll(/\[([^\]]+)\]\(/g)].map((match) => match[1].trim())
    if (sagas.length === 0) continue

    for (const saga of sagas) {
      // The table links the pack page ("The Sinister Secret of Saltmarsh",
      // "The Cogs"); the saga list uses the short name.
      const name = saga
        .replace(/^The Cogs$/i, 'Cogs Explorer Dungeons')
        .replace(/^The Sinister Secret of Saltmarsh$/i, 'Sinister Secret of Saltmarsh')
      cards[name] = [...(cards[name] ?? []), card]
    }
  }

  return cards
}

async function main() {
  const response = await fetch(WIKI_URL, { headers: { accept: 'text/plain' } })
  if (!response.ok) throw new Error(`Wiki fetch failed (${response.status})`)
  const cards = parseCardRows(await response.text())
  if (Object.keys(cards).length === 0) throw new Error('No card rows parsed — wiki layout changed')

  // Fail loudly if the page starts naming sagas differently from the grouping cache;
  // otherwise the badge silently disappears instead of erroring.
  const groupings = JSON.parse(fs.readFileSync(GROUPINGS_PATH, 'utf8')) as { sagaBands?: Record<string, unknown> }
  const knownSagas = new Set(Object.keys(groupings.sagaBands ?? {}).map(normalizeSagaName))
  const matched = Object.keys(cards).filter((name) => knownSagas.has(normalizeSagaName(name)))
  if (matched.length === 0) throw new Error('No card row matches a known saga — wiki names or the grouping cache changed')

  const unmatched = Object.keys(cards).filter((name) => !knownSagas.has(normalizeSagaName(name)))
  if (unmatched.length > 0) console.warn(`Not a saga in our list (ignored by the page): ${unmatched.join(', ')}`)

  const output: SagaCardsFile = {
    generatedAt: new Date().toISOString(),
    source: 'https://ddowiki.com/page/Item:Deck_of_Many_Curses',
    cards,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}: ${Object.keys(cards).length} sagas`)
  for (const [saga, list] of Object.entries(cards).sort()) console.log(`  ${saga}: ${list.join(', ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
