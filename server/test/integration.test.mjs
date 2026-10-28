import assert from 'node:assert/strict'
import test from 'node:test'

import { getCatalog } from '../dist/ddo.js'
import { applyObservations, emptyState, resolveArea } from '../dist/detect.js'

const options = { minSamples: 2, levelMargin: 4 }
const catalog = await getCatalog()

test('catalog covers the live quest list', () => {
  assert.ok(catalog.questById.size > 600, `only ${catalog.questById.size} quests`)
  assert.ok(catalog.byArea.size > 500, `only ${catalog.byArea.size} quest areas`)
  assert.ok(catalog.areaIsWilderness.size > 500)
})

test('wilderness zones are not treated as dungeons', () => {
  // Sorrowdusk Isle is an adventure area that also exists as a quest record.
  assert.equal(resolveArea('1879061486', 15, catalog, options.levelMargin), null)
})

test('mislabeled wilderness area is force-resolved', () => {
  // Vision of an Alternate History is flagged wilderness upstream but is the
  // Terror of the Demon Lords instance.
  const resolved = resolveArea('1879303679', 30, catalog, options.levelMargin)
  assert.equal(resolved?.quest.name, 'Terror of the Demon Lords')
})

test('heroic and legendary variants split on character level', () => {
  const heroic = resolveArea('1879132475', 18, catalog, options.levelMargin)
  const legendary = resolveArea('1879132475', 32, catalog, options.levelMargin)
  assert.equal(heroic?.quest.name, 'The Master Artificer')
  assert.equal(legendary?.quest.name, 'Legendary Master Artificer')
})

test('same-band multi-quest areas stay ambiguous', () => {
  // Outer Splinterskull Fortress holds seven quests around level 3-7.
  assert.equal(resolveArea('1879057422', 15, catalog, options.levelMargin), null)
})

test('public hub areas are ignored', () => {
  // The Marketplace is a public zone and never holds a quest visit.
  assert.equal(resolveArea('1879057731', 18, catalog, options.levelMargin), null)
  // Eveningstar exists twice; the public id must not resolve even though the
  // instanced id does.
  assert.equal(resolveArea('1879146142', 18, catalog, options.levelMargin), null)
  assert.ok(resolveArea('1879147309', 18, catalog, options.levelMargin))
})

test('a two-sample visit is recorded, a single-sample one is not', () => {
  const inside = { characterId: 'c1', online: true, areaId: '1879132475', level: 19, updatedAt: null }
  const outside = { characterId: 'c1', online: true, areaId: '1879248486', level: 19, updatedAt: null }

  const t0 = new Date('2026-01-01T00:00:00Z')
  const t1 = new Date('2026-01-01T00:01:00Z')
  const t2 = new Date('2026-01-01T00:02:00Z')
  const t3 = new Date('2026-01-01T00:03:00Z')

  const first = applyObservations(emptyState(), [inside], t0, catalog, options)
  assert.equal(first.completions.length, 0)

  const second = applyObservations(first.state, [inside], t1, catalog, options)
  assert.equal(second.completions.length, 0)

  const third = applyObservations(second.state, [outside], t2, catalog, options)
  assert.equal(third.completions.length, 1)
  assert.equal(third.completions[0].exitAt.toISOString(), t1.toISOString())
  assert.equal(catalog.questById.get(third.completions[0].questId)?.name, 'The Master Artificer')
  assert.equal(third.completions[0].band, 'heroic')

  // Re-applying the same observation must not produce a second completion.
  const fourth = applyObservations(third.state, [outside], t3, catalog, options)
  assert.equal(fourth.completions.length, 0)
})

test('a single upstream omission does not close a visit', () => {
  const inside = { characterId: 'c3', online: true, areaId: '1879132475', level: 19, updatedAt: null }
  const omitted = { characterId: 'c3', online: false, areaId: null, level: null, updatedAt: null, missing: true }

  const t0 = new Date('2026-01-01T00:00:00Z')
  const t1 = new Date('2026-01-01T00:01:00Z')
  const t2 = new Date('2026-01-01T00:02:00Z')
  const t3 = new Date('2026-01-01T00:03:00Z')
  const t4 = new Date('2026-01-01T00:04:00Z')

  const first = applyObservations(emptyState(), [inside], t0, catalog, options)
  const second = applyObservations(first.state, [inside], t1, catalog, options)
  const missingOnce = applyObservations(second.state, [omitted], t2, catalog, options)
  assert.equal(missingOnce.completions.length, 0)
  assert.equal(missingOnce.state.characters.c3.samples, 2)

  // A second consecutive omission is a real logout: close at the last inside sample.
  const missingTwice = applyObservations(missingOnce.state, [omitted], t3, catalog, options)
  assert.equal(missingTwice.completions.length, 1)
  assert.equal(missingTwice.completions[0].exitAt.toISOString(), t1.toISOString())

  // Reconnecting later starts a fresh visit.
  const back = applyObservations(missingTwice.state, [inside], t4, catalog, options)
  assert.equal(back.completions.length, 0)
  assert.equal(back.state.characters.c3.samples, 1)
})

test('a level drop into a low-level quest records a reincarnation', () => {
  // Pick any uniquely-mapped low-level quest area from the live catalog.
  const lowLevel = [...catalog.byArea.entries()].find(([areaId, quests]) => {
    if (quests.length !== 1) return false
    const quest = quests[0]
    if (catalog.areaIsPublic.get(areaId) !== false) return false
    if (catalog.areaIsWilderness.get(areaId) !== false) return false
    return quest.heroicCr !== null && quest.heroicCr <= 3
  })
  assert.ok(lowLevel, 'no low-level quest area in the catalog')
  const [areaId] = lowLevel

  const level20 = { characterId: 'tr1', online: true, areaId: '1879248486', level: 20, updatedAt: null }
  const level1Inside = { characterId: 'tr1', online: true, areaId, level: 1, updatedAt: null }

  const t0 = new Date('2026-01-01T00:00:00Z')
  const t1 = new Date('2026-01-01T00:01:00Z')

  const before = applyObservations(emptyState(), [level20], t0, catalog, options)
  assert.equal(before.reincarnations.length, 0)

  const after = applyObservations(before.state, [level1Inside], t1, catalog, options)
  assert.equal(after.reincarnations.length, 1)
  assert.equal(after.reincarnations[0].characterId, 'tr1')
  assert.equal(after.reincarnations[0].at.toISOString(), t1.toISOString())
  assert.equal(after.state.characters.tr1.pendingTrAt, null)

  // The dropped level is remembered, so a second low-level quest does not fire again.
  const again = applyObservations(after.state, [level1Inside], new Date('2026-01-01T00:02:00Z'), catalog, options)
  assert.equal(again.reincarnations.length, 0)
})

test('a level drop without a low-level quest does not record a reincarnation', () => {
  const level20 = { characterId: 'tr2', online: true, areaId: '1879248486', level: 20, updatedAt: null }
  const level1Hub = { characterId: 'tr2', online: true, areaId: '1879057731', level: 1, updatedAt: null }

  const t0 = new Date('2026-01-01T00:00:00Z')
  const t1 = new Date('2026-01-01T00:01:00Z')

  const before = applyObservations(emptyState(), [level20], t0, catalog, options)
  const after = applyObservations(before.state, [level1Hub], t1, catalog, options)
  assert.equal(after.reincarnations.length, 0)
  assert.ok(after.state.characters.tr2.pendingTrAt, 'the candidate should stay pending')
})

test('leaving the game also closes the visit', () => {
  const inside = { characterId: 'c2', online: true, areaId: '1879132475', level: 32, updatedAt: null }
  const offline = { characterId: 'c2', online: false, areaId: null, level: 32, updatedAt: null }

  const t0 = new Date('2026-01-01T00:00:00Z')
  const t1 = new Date('2026-01-01T00:01:00Z')
  const t2 = new Date('2026-01-01T00:02:00Z')

  const first = applyObservations(emptyState(), [inside], t0, catalog, options)
  const second = applyObservations(first.state, [inside], t1, catalog, options)
  const third = applyObservations(second.state, [offline], t2, catalog, options)

  assert.equal(third.completions.length, 1)
  assert.equal(catalog.questById.get(third.completions[0].questId)?.name, 'Legendary Master Artificer')
  assert.equal(third.completions[0].band, 'legendary')
})
