#!/usr/bin/env node
/**
 * One-off migration: completes `completions/{char}_{quest}` into
 * `completions/{char}_{quest}_{band}` so heroic/epic/legendary runs keep separate
 * history. Safe to re-run: documents that already carry a band are skipped.
 *
 * Usage: node scripts/migrate-bands.mjs [--dry-run]
 * Requires Application Default Credentials with Firestore access.
 */
import { Firestore } from '@google-cloud/firestore'
import { writeFileSync } from 'node:fs'

const QUESTS_URL = 'https://api.ddoaudit.com/v1/quests?force=false'
const DRY_RUN = process.argv.includes('--dry-run')
const BACKUP_PATH = '/tmp/opencode/completions-backup.json'

function versionsOf(quest) {
  const versions = []
  if (quest.heroicCr !== null) versions.push({ band: 'heroic', level: quest.heroicCr })
  if (quest.epicCr !== null) versions.push({ band: quest.epicCr >= 30 ? 'legendary' : 'epic', level: quest.epicCr })
  return versions
}

function bandForLevel(quest, level) {
  const versions = quest ? versionsOf(quest) : []
  if (versions.length === 0) return 'heroic'
  if (level === null || level === undefined) return versions[0].band
  return [...versions].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))[0].band
}

async function main() {
  const response = await fetch(QUESTS_URL)
  if (!response.ok) throw new Error(`Failed to fetch quests (${response.status})`)
  const payload = await response.json()
  const quests = new Map()
  for (const quest of payload.data ?? []) {
    quests.set(String(quest.id), {
      heroicCr: quest.heroic_normal_cr ?? null,
      epicCr: quest.epic_normal_cr ?? null,
    })
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'astute-nuance-286909'
const db = new Firestore({ projectId })
  const collection = db.collection('completions')
  const snapshot = await collection.get()

  const backup = snapshot.docs.map((document) => ({ id: document.id, data: document.data() }))
  writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2))
  console.log(`Project ${projectId}: backed up ${backup.length} documents to ${BACKUP_PATH}`)

  let migrated = 0
  let skipped = 0

  for (const document of snapshot.docs) {
    const data = document.data()
    if (data.band) {
      skipped += 1
      continue
    }

    const band = bandForLevel(quests.get(String(data.quest_id)), data.level_at_finish ?? null)
    const targetId = `${data.character_id}_${data.quest_id}_${band}`
    const target = collection.doc(targetId)

    if (DRY_RUN) {
      console.log(`  ${document.id} -> ${targetId}`)
      migrated += 1
      continue
    }

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(target)
      const existingData = existing.exists ? existing.data() : null

      const history = [
        ...(Array.isArray(data.history) ? data.history : []),
        ...(existingData && Array.isArray(existingData.history) ? existingData.history : []),
      ]
        .filter(Boolean)
        .sort((left, right) => right.toMillis() - left.toMillis())
        .slice(0, 10)

      transaction.set(
        target,
        {
          ...existingData,
          ...data,
          band,
          history,
          last_finished_at: history[0] ?? null,
        },
        { merge: true },
      )
      transaction.delete(document.ref)
    })
    migrated += 1
  }

  console.log(`${DRY_RUN ? 'Would migrate' : 'Migrated'} ${migrated} documents, skipped ${skipped}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
