import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeSmurfs, parseCharacterId, parseCharacterName, parseRemarkInput, remainingSmurfs } from '../dist/remarks.js'

test('character ids are validated', () => {
  assert.equal(parseCharacterId('47251953651').ok, true)
  assert.equal(parseCharacterId(47251953651).ok, true)
  assert.equal(parseCharacterId('abc').ok, false)
  assert.equal(parseCharacterId('').ok, false)
  assert.equal(parseCharacterId('1'.repeat(21)).ok, false)
  assert.equal(parseCharacterId(null).ok, false)
})

test('character names are validated', () => {
  assert.equal(parseCharacterName('Chz').ok, true)
  assert.equal(parseCharacterName('  Chz  ').ok, true)
  assert.equal(parseCharacterName('').ok, false)
  assert.equal(parseCharacterName('a\u0007b').ok, false)
  assert.equal(parseCharacterName('a'.repeat(65)).ok, false)
  assert.equal(parseCharacterName(42).ok, false)
})

test('smurfs always include the owner and are deduped by id', () => {
  const parsed = parseRemarkInput('47251953651', {
    characterName: 'Chz',
    verdict: 'good',
    note: '',
    smurfs: [
      { id: '47251953651', name: 'Chz' },
      { id: '47253340034', name: 'Chzz' },
      { id: '47253340034', name: 'chzz' },
      { id: null, name: 'Chzzz' },
      { id: null, name: 'CHZZZ' },
    ],
  })
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.smurfs, [
    { id: '47251953651', name: 'Chz' },
    { id: '47253340034', name: 'Chzz' },
    { id: null, name: 'Chzzz' },
  ])
})

test('a bare name in smurfs is still accepted', () => {
  const parsed = parseRemarkInput('1', { characterName: 'Chz', verdict: 'good', note: '', smurfs: ['Alt'] })
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.smurfs, [
    { id: '1', name: 'Chz' },
    { id: null, name: 'Alt' },
  ])
})

test('an omitted smurfs list is left undefined so the stored value is kept', () => {
  const parsed = parseRemarkInput('47251953651', { characterName: 'Chz', verdict: 'good', note: 'hi' })
  assert.equal(parsed.ok, true)
  assert.equal(parsed.value.smurfs, undefined)
  assert.equal(parsed.value.level, undefined)
  assert.equal(parsed.value.classes, undefined)
})

test('an explicit empty smurfs list keeps the owner', () => {
  const parsed = parseRemarkInput('47251953651', { characterName: 'Chz', verdict: 'info', note: '', smurfs: [] })
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.smurfs, [{ id: '47251953651', name: 'Chz' }])
})

test('invalid input is rejected with a message', () => {
  assert.equal(parseRemarkInput('1', { verdict: 'good', note: '' }).ok, false)
  assert.equal(parseRemarkInput('1', { characterName: 'Chz', verdict: 'meh', note: '' }).ok, false)
  assert.equal(parseRemarkInput('1', { characterName: 'Chz', verdict: 'good', note: 'x'.repeat(2001) }).ok, false)
  assert.equal(parseRemarkInput('1', { characterName: 'Chz', verdict: 'good', note: '', level: 99 }).ok, false)
  assert.equal(
    parseRemarkInput('1', { characterName: 'Chz', verdict: 'good', note: '', classes: [{ name: 'Cleric', level: 61 }] }).ok,
    false,
  )
  assert.equal(
    parseRemarkInput('1', {
      characterName: 'Chz',
      verdict: 'good',
      note: '',
      smurfs: Array.from({ length: 21 }, (_, i) => ({ id: String(i + 2), name: `Alt${i}` })),
    }).ok,
    false,
  )
  assert.equal(
    parseRemarkInput('1', { characterName: 'Chz', verdict: 'good', note: '', smurfs: [{ id: 'x', name: 'Alt' }] }).ok,
    false,
  )
})

test('a claimed character is removed from the old note', () => {
  const previous = [
    { id: '1', name: 'Chz' },
    { id: '2', name: 'Chzz' },
    { id: null, name: 'Chzzz' },
  ]
  const remaining = remainingSmurfs(previous, new Set(['2']), new Set(['chzzz']))
  assert.deepEqual(remaining, [{ id: '1', name: 'Chz' }])
})

test('an id-less smurf is matched by name', () => {
  const previous = [{ id: null, name: 'Chzzz' }, { id: '1', name: 'Chz' }]
  assert.deepEqual(remainingSmurfs(previous, new Set(), new Set(['chzzz'])), [{ id: '1', name: 'Chz' }])
})

test('a claim without an id still removes the character by name', () => {
  const previous = [{ id: '2', name: 'Chzz' }, { id: '1', name: 'Chz' }]
  assert.deepEqual(remainingSmurfs(previous, new Set(), new Set(['chzz'])), [{ id: '1', name: 'Chz' }])
})

test('nothing claimed keeps the note intact', () => {
  const previous = [{ id: '1', name: 'Chz' }]
  assert.equal(remainingSmurfs(previous, new Set(['9']), new Set(['other'])).length, 1)
})

test('merging two notes keeps one entry per character', () => {
  const merged = mergeSmurfs(
    [{ id: '1', name: 'Chz' }, { id: '2', name: 'Chzz' }],
    [{ id: '2', name: 'Chzz' }, { id: '3', name: 'Chzzz' }, { id: null, name: 'chz' }],
  )
  assert.deepEqual(merged, [
    { id: '1', name: 'Chz' },
    { id: '2', name: 'Chzz' },
    { id: '3', name: 'Chzzz' },
  ])
})
