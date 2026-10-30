import assert from 'node:assert/strict'
import test from 'node:test'

const baseUrl = process.env.BASE_URL
const password = process.env.LOG_PASSWORD
const characterId = process.env.TEST_CHARACTER_ID
const questId = process.env.TEST_QUEST_ID
const band = process.env.TEST_BAND ?? 'heroic'

const enabled = Boolean(baseUrl && password && characterId && questId)

const url = (path) => `${baseUrl}${path}`

const readState = async () => {
  const response = await fetch(url('/completions'))
  assert.equal(response.status, 200)
  const body = await response.json()
  return body.data?.[characterId]?.[`${questId}:${band}`] ?? null
}

const patch = (body, headers = {}) =>
  fetch(url(`/completions/${characterId}/${questId}/${band}`), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const auth = { 'x-log-password': password }

const bulkPatch = (updates, headers = auth) =>
  fetch(url('/completions/bulk'), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ updates }),
  })

test('e2e', { skip: enabled ? false : 'set BASE_URL, LOG_PASSWORD, TEST_CHARACTER_ID, TEST_QUEST_ID' }, async (t) => {
  // Never mutate a row that already holds real play history: history entries cannot
  // be restored through the API. Use a throwaway character/quest pair.
  const original = await readState()
  const skipMutation = (original?.history?.length ?? 0) > 0 ? 'test row already has real history' : false

  await t.test('public read works', async () => {
    const response = await fetch(url('/completions'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(typeof body.data, 'object')
  })

  await t.test('CORS preflight is answered for the Pages origin', async () => {
    const response = await fetch(url(`/completions/${characterId}/${questId}/${band}`), {
      method: 'OPTIONS',
      headers: {
        origin: 'https://nonjosh.github.io',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'x-log-password',
      },
    })
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://nonjosh.github.io')
  })

  await t.test('polling requires scheduler OIDC', async () => {
    const response = await fetch(url('/poll'), { method: 'POST' })
    assert.equal(response.status, 401)
  })

  await t.test('write rejects a wrong password', async () => {
    const response = await patch({ finished: true }, { 'x-log-password': 'wrong' })
    assert.equal(response.status, 401)
  })

  await t.test('unknown character is rejected', async () => {
    const response = await fetch(url('/completions/1/2/heroic'), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ finished: true }),
    })
    assert.equal(response.status, 400)
  })

  await t.test('future timestamps are rejected', async () => {
    const response = await patch(
      { finished: true, lastFinishedAt: new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString() },
      auth,
    )
    assert.equal(response.status, 400)
  })

  await t.test('malformed JSON is a client error, not a crash', async () => {
    const response = await fetch(url(`/completions/${characterId}/${questId}/${band}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...auth },
      body: '{not json',
    })
    assert.equal(response.status, 400)
  })

  await t.test('write round-trips through Firestore', { skip: skipMutation }, async () => {
    const response = await patch({ finished: true }, auth)
    assert.equal(response.status, 204)

    const updated = await readState()
    assert.equal(updated.finished, true)
  })

  await t.test('uncheck keeps the observed timestamp', { skip: skipMutation }, async () => {
    const stamp = new Date(Date.now() - 3_600_000).toISOString()
    await patch({ finished: true, lastFinishedAt: stamp }, auth)
    const unchecked = await patch({ finished: false }, auth)
    assert.equal(unchecked.status, 204)

    const state = await readState()
    assert.equal(state.finished, false)
    assert.equal(new Date(state.lastFinishedAt).toISOString(), stamp)
  })

  await t.test('repeat completions accumulate newest first', { skip: skipMutation }, async () => {
    const older = new Date(Date.now() - 5 * 3_600_000).toISOString()
    const newer = new Date(Date.now() - 2 * 3_600_000).toISOString()

    // Start from a clean row so the assertions do not depend on the previous subtest.
    await patch({ finished: true, lastFinishedAt: null }, auth)
    await patch({ finished: true, lastFinishedAt: older }, auth)
    await patch({ finished: true, lastFinishedAt: newer }, auth)

    const state = await readState()
    assert.ok(Array.isArray(state.history), 'history must be an array')
    assert.equal(new Date(state.history[0]).toISOString(), newer)
    assert.ok(
      state.history.some((entry) => new Date(entry).toISOString() === older),
      'older completion must be kept',
    )
    assert.equal(new Date(state.lastFinishedAt).toISOString(), newer)
    assert.ok(state.history.length <= 10, 'history is capped at 10 entries')
  })

  await t.test('backfill without a date clears history', { skip: skipMutation }, async () => {
    await patch({ finished: true, lastFinishedAt: null }, auth)
    const state = await readState()
    assert.equal(state.finished, true)
    assert.equal(state.lastFinishedAt, null)
    assert.deepEqual(state.history, [])
  })

  await t.test('bulk update writes in one request', { skip: skipMutation }, async () => {
    const response = await bulkPatch([
      { characterId, questId, band, finished: true },
      { characterId, questId, band, finished: true, lastFinishedAt: null },
    ])
    assert.equal(response.status, 200)

    const body = await response.json()
    assert.equal(body.data.updated, 1, 'duplicate rows collapse to one write')

    const state = await readState()
    assert.equal(state.finished, true)
  })

  await t.test('bulk requires the password', async () => {
    const response = await bulkPatch([{ characterId, questId, band, finished: true }], {
      'x-log-password': 'wrong',
    })
    assert.equal(response.status, 401)
  })

  await t.test('bulk rejects an unknown character', async () => {
    const response = await bulkPatch([{ characterId: '1', questId, band, finished: true }])
    assert.equal(response.status, 400)
  })

  await t.test('reincarnations are readable', async () => {
    const response = await fetch(url('/reincarnations'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(typeof body.data, 'object')
  })

  await t.test('reincarnation reset requires the password', async () => {
    const response = await fetch(url(`/reincarnations/${characterId}`), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-log-password': 'wrong' },
      body: '{}',
    })
    assert.equal(response.status, 401)
  })

  await t.test('reincarnation reset rejects an unknown character', async () => {
    const response = await fetch(url('/reincarnations/1'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: '{}',
    })
    assert.equal(response.status, 400)
  })

  await t.test('notes need the password', async () => {
    const response = await fetch(url('/remarks'))
    assert.equal(response.status, 401)
  })

  await t.test('a note round-trips and a write without smurfs keeps them', async () => {
    const id = String(900000000000 + (Date.now() % 100000))
    const alt = { id: String(Number(id) + 1), name: 'E2E Alt' }
    try {
      const created = await fetch(url(`/remarks/${id}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...auth },
        body: JSON.stringify({ characterName: 'E2E Note', verdict: 'good', note: 'e2e', smurfs: [alt] }),
      })
      assert.equal(created.status, 200)
      const saved = (await created.json()).data
      assert.equal(saved.characterId, id)
      assert.deepEqual(saved.smurfs, [{ id, name: 'E2E Note' }, alt])

      // A stale client omits the field; that must not clear the links.
      const updated = await fetch(url(`/remarks/${id}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...auth },
        body: JSON.stringify({ characterName: 'E2E Note', verdict: 'avoid', note: 'e2e' }),
      })
      assert.equal(updated.status, 200)
      assert.deepEqual((await updated.json()).data.smurfs, [{ id, name: 'E2E Note' }, alt])

      const listed = await fetch(url('/remarks'), { headers: auth })
      assert.equal(listed.status, 200)
      const notes = (await listed.json()).data
      assert.equal(notes.find((entry) => entry.characterId === id)?.verdict, 'avoid')
    } finally {
      await fetch(url(`/remarks/${id}`), { method: 'DELETE', headers: auth })
    }
  })

  await t.test('linking a character moves it out of its old note', async () => {
    const base = 910000000000 + (Date.now() % 100000)
    const first = String(base)
    const second = String(base + 1)
    const moved = { id: String(base + 2), name: 'E2E Moved' }
    try {
      // `moved` starts on the first note, so linking it to the second must take it away.
      for (const [id, name, smurfs] of [
        [first, 'E2E First', [moved]],
        [second, 'E2E Second', undefined],
      ]) {
        const response = await fetch(url(`/remarks/${id}`), {
          method: 'PUT',
          headers: { 'content-type': 'application/json', ...auth },
          body: JSON.stringify({ characterName: name, verdict: 'good', note: 'e2e', ...(smurfs ? { smurfs } : {}) }),
        })
        assert.equal(response.status, 200)
      }

      // The second note adopts `moved`, which must remove it from any other note.
      const linked = await fetch(url(`/remarks/${second}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...auth },
        body: JSON.stringify({ characterName: 'E2E Second', verdict: 'good', note: 'e2e', smurfs: [moved] }),
      })
      assert.equal(linked.status, 200)

      const listed = await fetch(url('/remarks'), { headers: auth })
      const notes = (await listed.json()).data
      const holders = notes.filter((entry) => entry.smurfs.some((smurf) => smurf.id === moved.id))
      assert.equal(holders.length, 1)
      assert.equal(holders[0].characterId, second)
      // The first note keeps only its owner.
      const firstNote = notes.find((entry) => entry.characterId === first)
      assert.deepEqual(firstNote?.smurfs, [{ id: first, name: 'E2E First' }])
    } finally {
      for (const id of [first, second]) {
        await fetch(url(`/remarks/${id}`), { method: 'DELETE', headers: auth })
      }
    }
  })

  await t.test('deleting a note removes it', async () => {
    const id = String(920000000000 + (Date.now() % 100000))
    await fetch(url(`/remarks/${id}`), {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ characterName: 'E2E Delete', verdict: 'info', note: 'e2e' }),
    })
    const removed = await fetch(url(`/remarks/${id}`), { method: 'DELETE', headers: auth })
    assert.equal(removed.status, 204)

    const listed = await fetch(url('/remarks'), { headers: auth })
    const notes = (await listed.json()).data
    assert.equal(notes.some((entry) => entry.characterId === id), false)
  })

  await t.test('restore a clean row', { skip: skipMutation }, async () => {
    const response = await patch({ finished: false, lastFinishedAt: null }, auth)
    assert.equal(response.status, 204)

    const restored = await readState()
    assert.equal(restored.finished, false)
    assert.deepEqual(restored.history, [])
  })
})
