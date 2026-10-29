#!/usr/bin/env node
/**
 * One-off: moves this app's collections to a prefixed name inside the default
 * database, so the data is obvious when another app shares the project.
 *
 * Usage:
 *   node scripts/migrate-collection-prefix.mjs --dry-run
 *   node scripts/migrate-collection-prefix.mjs
 *
 * Copies every document (same id, same data) to the new collection, verifies the
 * count, writes a JSON backup, then deletes the old documents. Re-running is safe:
 * it copies whatever is still in the old collection.
 */
import { Firestore } from '@google-cloud/firestore'
import { writeFileSync } from 'node:fs'

const PREFIX = 'ddo_log_'
const DRY_RUN = process.argv.includes('--dry-run')
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'astute-nuance-286909'
const BACKUP_PATH = '/tmp/opencode/collection-backup.json'

const COLLECTIONS = ['completions', 'edits', 'reincarnations', 'state']

const db = new Firestore({ projectId })

async function migrateCollection(name) {
  const source = db.collection(name)
  const target = db.collection(`${PREFIX}${name}`)
  const snapshot = await source.get()
  if (snapshot.empty) {
    console.log(`${name}: empty, nothing to copy`)
    return { name, copied: 0 }
  }

  if (DRY_RUN) {
    console.log(`${name}: would copy ${snapshot.size} document(s) to ${target.id}`)
    return { name, copied: snapshot.size }
  }

  // Copy in batches of 400 (Firestore allows 500 writes per batch).
  const docs = snapshot.docs
  for (let index = 0; index < docs.length; index += 400) {
    const batch = db.batch()
    for (const document of docs.slice(index, index + 400)) {
      batch.set(target.doc(document.id), document.data())
    }
    await batch.commit()
  }

  const copied = await target.get()
  if (copied.size < snapshot.size) {
    throw new Error(`${name}: copied ${copied.size} of ${snapshot.size} documents, aborting before delete`)
  }

  // Delete the old documents only after the copy is verified.
  for (let index = 0; index < docs.length; index += 400) {
    const batch = db.batch()
    for (const document of docs.slice(index, index + 400)) batch.delete(document.ref)
    await batch.commit()
  }

  console.log(`${name}: copied ${snapshot.size} -> ${target.id}, old documents deleted`)
  return { name, copied: snapshot.size }
}

async function main() {
  const results = []
  const backup = {}

  for (const name of COLLECTIONS) {
    const snapshot = await db.collection(name).get()
    if (!snapshot.empty) {
      backup[name] = snapshot.docs.map((document) => ({ id: document.id, data: document.data() }))
    }
    results.push(await migrateCollection(name))
  }

  if (!DRY_RUN) {
    writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2))
    console.log(`Backup of the old collections written to ${BACKUP_PATH}`)
  }

  const total = results.reduce((sum, result) => sum + result.copied, 0)
  console.log(`${DRY_RUN ? 'Would migrate' : 'Migrated'} ${total} document(s) to the '${PREFIX}' prefix`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.terminate())
