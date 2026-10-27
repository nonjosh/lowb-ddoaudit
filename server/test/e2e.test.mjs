import assert from 'node:assert/strict'
import test from 'node:test'

const baseUrl = process.env.BASE_URL
const password = process.env.LOG_PASSWORD
const characterId = process.env.TEST_CHARACTER_ID
const questId = process.env.TEST_QUEST_ID

const enabled = Boolean(baseUrl && password && characterId && questId)

test('e2e', { skip: enabled ? false : 'set BASE_URL, LOG_PASSWORD, TEST_CHARACTER_ID, TEST_QUEST_ID' }, async (t) => {
  const url = (path) => `${baseUrl}${path}`

  const readState = async () => {
    const response = await fetch(url('/completions'))
    assert.equal(response.status, 200)
    const body = await response.json()
    return body.data?.[characterId]?.[questId] ?? null
  }

  const patch = (body, headers = {}) =>
    fetch(url(`/completions/${characterId}/${questId}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })

  const original = await readState()

  await t.test('public read works', async () => {
    const response = await fetch(url('/completions'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(typeof body.data, 'object')
  })

  await t.test('CORS preflight is answered for the Pages origin', async () => {
    const response = await fetch(url(`/completions/${characterId}/${questId}`), {
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
    const response = await fetch(url('/completions/1/2'), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-log-password': password },
      body: JSON.stringify({ finished: true }),
    })
    assert.equal(response.status, 400)
  })

  await t.test('write round-trips through Firestore', async () => {
    const target = original?.finished === true ? false : true
    const response = await patch({ finished: target }, { 'x-log-password': password })
    assert.equal(response.status, 204)

    const updated = await readState()
    assert.equal(updated.finished, target)
  })

  await t.test('uncheck keeps the observed timestamp', async () => {
    const stamp = new Date(Date.now() - 3_600_000).toISOString()
    await patch({ finished: true, lastFinishedAt: stamp }, { 'x-log-password': password })
    const unchecked = await patch({ finished: false }, { 'x-log-password': password })
    assert.equal(unchecked.status, 204)

    const state = await readState()
    assert.equal(state.finished, false)
    assert.equal(new Date(state.lastFinishedAt).toISOString(), stamp)
  })

  await t.test('future timestamps are rejected', async () => {
    const response = await patch(
      { finished: true, lastFinishedAt: new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString() },
      { 'x-log-password': password },
    )
    assert.equal(response.status, 400)
  })

  await t.test('malformed JSON is a client error, not a crash', async () => {
    const response = await fetch(url(`/completions/${characterId}/${questId}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-log-password': password },
      body: '{not json',
    })
    assert.equal(response.status, 400)
  })

  await t.test('restore original state', async () => {
    if (original === null) {
      await patch({ finished: false, lastFinishedAt: null }, { 'x-log-password': password })
      return
    }
    const response = await patch(
      { finished: original.finished, lastFinishedAt: original.lastFinishedAt },
      { 'x-log-password': password },
    )
    assert.equal(response.status, 204)
    const restored = await readState()
    assert.equal(restored.finished, original.finished)
  })
})
