/**
 * One-off: proves the poller records a run's length and that `durations_ms` stays aligned
 * with `history` across a second run and a manual edit. Uses a synthetic character id and
 * removes everything it writes.
 *
 * Usage: npm run build && node scripts/check-completion-duration.mjs
 */
// Both clients must resolve the same project: store.ts builds its own Firestore, so pin
// the env vars before importing it. google-auth reads GCLOUD_PROJECT first, so both must
// agree or writes and cleanup hit different projects.
const PROJECT =
  process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'astute-nuance-286909'
process.env.GCLOUD_PROJECT = PROJECT
process.env.GOOGLE_CLOUD_PROJECT = PROJECT

const { Firestore } = await import('@google-cloud/firestore')
const { applyManualEdit, recordPolledCompletion } = await import('../dist/store.js')

const CHARACTER = 'synthetic-duration'
const QUEST = '1'
const BAND = 'heroic'
const MINUTE = 60_000
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

const minutes = (ms) => Math.round(ms / MINUTE)

async function main() {
  await cleanup()
  const now = Date.now()

  // First polled run: 14 minutes inside.
  await recordPolledCompletion({
    characterId: CHARACTER,
    questId: QUEST,
    band: BAND,
    enteredAt: new Date(now - 20 * MINUTE),
    exitAt: new Date(now - 6 * MINUTE),
    level: 7,
    players: [],
  })

  const id = `${CHARACTER}_${QUEST}_${BAND}`
  let data = (await completions.doc(id).get()).data()
  assert(data.history.length === 1, 'expected one history entry')
  assert(data.durations_ms?.length === 1, 'expected one duration')
  assert(minutes(data.durations_ms[0]) === 14, `expected 14m, got ${minutes(data.durations_ms[0])}m`)

  // Second run, 5 minutes: newest first in both arrays.
  await recordPolledCompletion({
    characterId: CHARACTER,
    questId: QUEST,
    band: BAND,
    enteredAt: new Date(now - 5 * MINUTE),
    exitAt: new Date(now - 1 * MINUTE),
    level: 7,
    players: [{ id: 'synthetic-buddy', name: 'Buddy', level: 7, classes: [{ name: 'Fighter', level: 7 }] }],
  })

  data = (await completions.doc(id).get()).data()
  assert(data.history.length === 2, 'expected two history entries')
  assert(data.durations_ms.length === 2, 'durations not aligned with history')
  assert(minutes(data.durations_ms[0]) === 4, `newest run should be 4m, got ${minutes(data.durations_ms[0])}m`)
  assert(minutes(data.durations_ms[1]) === 14, 'older run lost its duration')
  assert(data.players.length === 2, 'players not aligned with history')
  assert(data.players[0].members[0].name === 'Buddy', 'newest run lost its co-player')
  assert(data.players[1] === null, 'a run with no co-players must be null')

  // A hand-entered completion has no measured length but must stay aligned.
  await applyManualEdit({
    characterId: CHARACTER,
    questId: QUEST,
    band: BAND,
    finished: true,
    // Between the two runs, so this exercises a middle insert rather than an append.
    lastFinishedAt: new Date(now - 3 * MINUTE),
    level: null,
  })

  data = (await completions.doc(id).get()).data()
  assert(data.history.length === 3, 'manual edit did not add a history entry')
  assert(data.durations_ms.length === 3, 'durations lost alignment after a manual edit')
  // History is newest-first, so the manual date sits between the two measured runs.
  assert(data.durations_ms[1] === null, 'a manual entry must have no duration')
  assert(minutes(data.durations_ms[0]) === 4, 'newest run lost its duration after a manual edit')
  assert(minutes(data.durations_ms[2]) === 14, 'oldest run lost its duration after a manual edit')
  assert(data.players.length === 3, 'players lost alignment after a manual edit')
  assert(data.players[0].members[0].name === 'Buddy', 'newest run lost its co-player after a manual edit')
  assert(data.players[1] === null, 'a manual entry must have no co-player list')

  // Clearing the history clears the durations with it.
  await applyManualEdit({
    characterId: CHARACTER,
    questId: QUEST,
    band: BAND,
    finished: true,
    lastFinishedAt: null,
    level: null,
  })
  data = (await completions.doc(id).get()).data()
  assert(
    data.history.length === 0 && data.durations_ms.length === 0 && (data.players ?? []).length === 0,
    'clearing history left durations or players behind',
  )

  console.log('OK: polled runs record duration and co-players, manual entries are null, arrays stay aligned')
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
      console.error('cleanup failed:', error)
      process.exitCode = 1
    }
    await db.terminate()
  })
