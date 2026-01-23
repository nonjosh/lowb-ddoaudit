#!/usr/bin/env npx tsx
/* eslint-disable no-undef */
/**
 * Script to update character_ids.csv with new character IDs from the DDO Audit API.
 *
 * Usage: npx tsx scripts/update-character-ids.ts
 *
 * This script:
 * 1. Reads lowb.json to get all character names by player
 * 2. Reads character_ids.csv to get existing name->id mappings
 * 3. Finds character names in lowb.json that are missing from the CSV
 * 4. Fetches the character ID from the DDO Audit API for each missing name
 * 5. Appends new entries to character_ids.csv
 */

import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(process.cwd(), 'src', 'data')
const LOWB_JSON_PATH = path.join(DATA_DIR, 'lowb.json')
const CHARACTER_IDS_CSV_PATH = path.join(DATA_DIR, 'character_ids.csv')

const DDO_AUDIT_API_BASE = 'https://api.ddoaudit.com/v1/characters'
const SERVER_NAME = 'shadowdale'

// Delay between API requests to avoid rate limiting (ms)
const REQUEST_DELAY_MS = 500

interface LowbData {
  [playerName: string]: string[]
}

interface CharacterIdEntry {
  name: string
  id: string
}

/**
 * Parse the lowb.json file to get all character names
 */
function readLowbJson(): LowbData {
  const content = fs.readFileSync(LOWB_JSON_PATH, 'utf-8')
  return JSON.parse(content) as LowbData
}

/**
 * Get all character names from lowb.json
 */
function getAllCharacterNames(lowbData: LowbData): string[] {
  const names: string[] = []
  for (const charList of Object.values(lowbData)) {
    names.push(...charList)
  }
  return names
}

/**
 * Parse the character_ids.csv file
 */
function readCharacterIdsCsv(): CharacterIdEntry[] {
  if (!fs.existsSync(CHARACTER_IDS_CSV_PATH)) {
    return []
  }

  const content = fs.readFileSync(CHARACTER_IDS_CSV_PATH, 'utf-8')
  const lines = content.trim().split('\n')

  // Skip header line
  const entries: CharacterIdEntry[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const [name, id] = line.split(',')
    if (name && id) {
      entries.push({ name: name.trim(), id: id.trim() })
    }
  }

  return entries
}

/**
 * Write updated entries to character_ids.csv
 */
function writeCharacterIdsCsv(entries: CharacterIdEntry[]): void {
  const lines = ['name,id']
  for (const entry of entries) {
    lines.push(`${entry.name},${entry.id}`)
  }
  fs.writeFileSync(CHARACTER_IDS_CSV_PATH, lines.join('\n') + '\n')
}

/**
 * Fetch character ID from DDO Audit API
 */
async function fetchCharacterId(characterName: string): Promise<string | null> {
  const url = `${DDO_AUDIT_API_BASE}/${SERVER_NAME}/${encodeURIComponent(characterName)}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`  ❌ API returned ${response.status} for "${characterName}"`)
      return null
    }

    const json = await response.json()
    const id = json?.data?.id

    if (id !== undefined && id !== null) {
      return String(id)
    }

    console.error(`  ❌ No ID found in response for "${characterName}"`)
    return null
  } catch (error) {
    console.error(`  ❌ Error fetching "${characterName}":`, error)
    return null
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('📖 Reading lowb.json...')
  const lowbData = readLowbJson()
  const allCharacterNames = getAllCharacterNames(lowbData)
  console.log(`   Found ${allCharacterNames.length} character names in lowb.json`)

  console.log('📖 Reading character_ids.csv...')
  const existingEntries = readCharacterIdsCsv()
  const existingNames = new Set(existingEntries.map((e) => e.name.toLowerCase()))
  console.log(`   Found ${existingEntries.length} existing entries in character_ids.csv`)

  // Find missing character names
  const missingNames = allCharacterNames.filter((name) => !existingNames.has(name.toLowerCase()))

  if (missingNames.length === 0) {
    console.log('✅ All character names already have IDs in character_ids.csv')
    return
  }

  console.log(`\n🔍 Found ${missingNames.length} character names missing from CSV:`)
  for (const name of missingNames) {
    console.log(`   - ${name}`)
  }

  console.log('\n🌐 Fetching character IDs from DDO Audit API...')
  const newEntries: CharacterIdEntry[] = []
  const failedNames: string[] = []

  for (const name of missingNames) {
    console.log(`   Fetching ID for "${name}"...`)
    const id = await fetchCharacterId(name)

    if (id) {
      console.log(`   ✅ ${name} -> ${id}`)
      newEntries.push({ name, id })
    } else {
      failedNames.push(name)
    }

    // Delay between requests to avoid rate limiting
    if (missingNames.indexOf(name) < missingNames.length - 1) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  if (newEntries.length > 0) {
    console.log(`\n💾 Adding ${newEntries.length} new entries to character_ids.csv...`)
    const updatedEntries = [...existingEntries, ...newEntries]
    writeCharacterIdsCsv(updatedEntries)
    console.log('✅ character_ids.csv updated successfully')
  }

  if (failedNames.length > 0) {
    console.log(`\n⚠️  Failed to fetch IDs for ${failedNames.length} characters:`)
    for (const name of failedNames) {
      console.log(`   - ${name}`)
    }
  }

  console.log('\n🎉 Done!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
