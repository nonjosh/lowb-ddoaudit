/**
 * One-off: proves that a manual edit stores both the state it replaced and the state it
 * produced, so a wrong bulk edit is undoable (and drift-checkable). Uses a synthetic
 * character id and removes everything it writes.
 *
 * Usage: npm run build && node scripts/check-edit-undo.mjs
 */
// Both clients must resolve the same project: store.ts builds its own Firestore, so pin
// the env vars before importing it. google-auth reads GCLOUD_PROJECT first, then
// GOOGLE_CLOUD_PROJECT, so both must agree or writes and cleanup hit different projects.
const PROJECT =
  process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'astute-nuance-286909'
process.env.GCLOUD_PROJECT = PROJECT
process.env.GOOGLE_CLOUD_PROJECT = PROJECT

const { Firestore, Timestamp } = await import('@google-cloud/firestore')
const { applyManualEdit } = await import('../dist/store.js')

const CHARACTER = 'synthetic-check'
const QUEST = '1'
const BAND = 'heroic'
const db = new Firestore({ projectId: PROJECT })
const completions = db.collection('ddo_log_completions')
const edits = db.collection('ddo_log_edits')
console.log(`project ${PROJECT}`)

async function cleanup() {
  for (const collection of [completions, edits]) {
    const snapshot = await collection.where('character_id', '==', CHARACTER).get()
    if (snapshot.empty) continue
    const batch = db.batch()
    for (const document of snapshot.docs) batch.delete(document.ref)
    await batch.commit()
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`)
}

async function main() {
  await cleanup()
  const finishedAt = Timestamp.fromMillis(Date.now() - 60_000)
  const id = `${CHARACTER}_${QUEST}_${BAND}`
  await completions.doc(id).set({
    character_id: CHARACTER,
    quest_id: QUEST,
    band: BAND,
    finished: true,
    last_finished_at: finishedAt,
    history: [finishedAt],
    level_at_finish: 7,
    source: 'poll',
    updated_at: Timestamp.now(),
  })

  // Backfill without a date: the destructive case this log has to make recoverable.
  await applyManualEdit({
    characterId: CHARACTER,
    questId: QUEST,
    band: BAND,
    finished: false,
    lastFinishedAt: null,
    level: null,
  })

  const logged = await edits.where('character_id', '==', CHARACTER).get()
  assert(logged.size === 1, `expected 1 edit document, got ${logged.size}`)
  const entry = logged.docs[0].data()

  // Before state.
  assert(entry.previous_exists === true, 'previous_exists missing')
  assert(entry.previous_finished === true, 'previous_finished missing')
  assert(entry.previous_history?.length === 1, 'previous_history missing')
  assert(
    entry.previous_history[0].toMillis() === finishedAt.toMillis(),
    'previous_history timestamp differs',
  )
  assert(entry.previous_level_at_finish === 7, 'previous_level_at_finish missing')
  assert(entry.previous_source === 'poll', 'previous_source missing')

  // After state, used to detect drift before replaying an undo.
  assert(entry.finished === false, 'after finished not stored')
  assert(entry.history?.length === 0, 'after history not stored')

  const completion = (await completions.doc(id).get()).data()
  assert(completion.finished === false, 'completion not unchecked')
  assert(completion.history.length === 0, 'history should be cleared by a no-date backfill')

  // A second edit on a row that does not exist must be undoable by deletion.
  await applyManualEdit({
    characterId: CHARACTER,
    questId: '2',
    band: BAND,
    finished: true,
    lastFinishedAt: null,
    level: null,
  })
  const created = await edits.where('character_id', '==', CHARACTER).get()
  const createdEntry = created.docs.map((document) => document.data()).find((data) => data.quest_id === '2')
  assert(createdEntry !== undefined, 'edit document for the new row is missing')
  assert(createdEntry.previous_exists === false, 'new-row edit not flagged')

  console.log('OK: edit stores before state, after state, and whether the row existed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanup()
    } catch (error) {
      // Never report success with synthetic data left behind.
      console.error('cleanup failed:', error)
      process.exitCode = 1
    }
    await db.terminate()
  })
