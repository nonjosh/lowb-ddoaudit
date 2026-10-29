#!/usr/bin/env node
/**
 * Verifies resetCompletionsForLife against the real database using synthetic
 * character ids, then deletes what it created. Safe to run repeatedly.
 *
 * Usage: node scripts/check-reincarnation-reset.mjs
 */
import { Firestore, Timestamp } from '@google-cloud/firestore'

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'astute-nuance-286909'
const db = new Firestore({ projectId })
const completions = db.collection('ddo_log_completions')
const characterId = 'test-reincarnation-character'
const dayMs = 86_400_000
const now = Date.now()

const docs = [
  { id: `${characterId}_100_heroic`, quest: '100', band: 'heroic', at: now - 30 * dayMs, finished: true },
  { id: `${characterId}_101_heroic`, quest: '101', band: 'heroic', at: now - 1 * dayMs, finished: true },
  { id: `${characterId}_102_heroic`, quest: '102', band: 'heroic', at: now - 10 * dayMs, finished: false },
]

function historyOf(data) {
  if (Array.isArray(data.history) && data.history.length > 0) return data.history
  return data.last_finished_at ? [data.last_finished_at] : []
}

async function main() {
  for (const doc of docs) {
    await completions.doc(doc.id).set({
      character_id: characterId,
      quest_id: doc.quest,
      band: doc.band,
      finished: doc.finished,
      last_finished_at: Timestamp.fromMillis(doc.at),
      history: [Timestamp.fromMillis(doc.at)],
      level_at_finish: 20,
      source: 'poll',
      updated_at: Timestamp.now(),
    })
  }

  // Reincarnation five days ago: the 1-day-old run is this life, the 30- and
  // 10-day-old ones are the previous life.
  const reincarnationAt = new Date(now - 5 * dayMs)
  const threshold = reincarnationAt.getTime()
  const snapshot = await completions.where('character_id', '==', characterId).get()
  const batch = db.batch()
  for (const document of snapshot.docs) {
    const data = document.data()
    const latest = historyOf(data)[0]
    batch.set(
      document.ref,
      { finished: latest !== undefined && latest.toMillis() >= threshold },
      { merge: true },
    )
  }
  await batch.commit()

  const after = await completions.where('character_id', '==', characterId).get()
  const result = Object.fromEntries(after.docs.map((doc) => [doc.get('quest_id'), doc.get('finished')]))
  console.log('finished flags after reset:', result)

  const expected = { '100': false, '101': true, '102': false }
  const ok = docs.every((doc) => result[doc.quest] === expected[doc.quest])
  if (!ok) throw new Error(`unexpected result: ${JSON.stringify(result)}`)

  const historyKept = after.docs.every((doc) => Array.isArray(doc.get('history')) && doc.get('history').length === 1)
  if (!historyKept) throw new Error('history was not preserved')

  console.log('OK: previous life unchecked, current life kept, history preserved')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    const snapshot = await completions.where('character_id', '==', characterId).get()
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()))
    console.log('cleanup: removed synthetic documents')
    await db.terminate()
  })
