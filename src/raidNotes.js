import raidNotesRaw from './assets/raid_notes.txt?raw'

function keyify(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} raw
 * @returns {Record<string, { raidName: string, augments: string[], sets: string[], notes: string[] }>}
 */
function parseRaidNotes(raw) {
  const lines = String(raw ?? '').replace(/\r\n/g, '\n').split('\n')

  /** @type {Record<string, { raidName: string, augments: string[], sets: string[], notes: string[] }> } */
  const out = {}

  /** @type {{ raidName: string, augments: string[], sets: string[], notes: string[] } | null} */
  let current = null
  /** @type {'augment' | 'set' | 'notes' | null} */
  let section = null
  /** @type {string | null} */
  let pendingNoteLabel = null

  const flushPendingLabel = () => {
    if (pendingNoteLabel && current) {
      current.notes.push(`${pendingNoteLabel}:`) // standalone label
    }
    pendingNoteLabel = null
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      flushPendingLabel()
      const raidName = trimmed.slice(3).trim()
      current = { raidName, augments: [], sets: [], notes: [] }
      section = null
      pendingNoteLabel = null
      const key = keyify(raidName)
      if (key) out[key] = current
      continue
    }

    if (!current) continue

    if (!trimmed) {
      flushPendingLabel()
      continue
    }

    // Section headers
    if (/^augment(s)?:$/i.test(trimmed)) {
      flushPendingLabel()
      section = 'augment'
      continue
    }
    if (/^set(s)?:$/i.test(trimmed)) {
      flushPendingLabel()
      section = 'set'
      continue
    }

    // Other labeled subsections (e.g. "Project Nemesis Sequence:")
    if (/:$/.test(trimmed)) {
      flushPendingLabel()
      pendingNoteLabel = trimmed.slice(0, -1).trim()
      section = 'notes'
      continue
    }

    if (pendingNoteLabel) {
      current.notes.push(`${pendingNoteLabel}: ${trimmed}`)
      pendingNoteLabel = null
      section = 'notes'
      continue
    }

    if (section === 'augment') {
      current.augments.push(trimmed)
    } else if (section === 'set') {
      current.sets.push(trimmed)
    } else {
      current.notes.push(trimmed)
    }
  }

  flushPendingLabel()
  return out
}

const RAID_NOTES_BY_KEY = parseRaidNotes(raidNotesRaw)

/**
 * @param {string} raidName
 */
export function getRaidNotesForRaidName(raidName) {
  const key = keyify(raidName)
  if (!key) return null
  return RAID_NOTES_BY_KEY[key] ?? null
}
