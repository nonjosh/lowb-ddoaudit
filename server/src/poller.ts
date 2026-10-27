import { config } from './config.js'
import { applyObservations } from './detect.js'
import { fetchObservations, getCatalog } from './ddo.js'
import { loadPollerState, recordPolledCompletion, savePollerState } from './store.js'

export interface PollResult {
  polled: number
  completed: number
  recorded: string[]
  skipped?: boolean
}

// Overlap protection is the in-flight flag (one instance) plus the compare-and-swap
// in savePollerState. A time-based gap is deliberately not used: scheduler jitter
// could skip a legitimate tick and lose a sample.
let inFlight = false

export async function runPoll(now: Date = new Date()): Promise<PollResult> {
  if (inFlight) {
    return { polled: 0, completed: 0, recorded: [], skipped: true }
  }
  inFlight = true

  try {
    return await pollOnce(now)
  } finally {
    inFlight = false
  }
}

async function pollOnce(now: Date): Promise<PollResult> {
  if (config.trackedCharacterIds.length === 0) {
    throw new Error('TRACKED_CHARACTER_IDS is empty')
  }

  const state = await loadPollerState()
  const catalog = await getCatalog()
  const observations = await fetchObservations(config.trackedCharacterIds)

  const { state: nextState, completions } = applyObservations(state, observations, now, catalog, {
    minSamples: config.minSamples,
    levelMargin: config.levelMargin,
  })

  // Record before advancing state: a failed write is retried on the next tick and
  // deduped by the timestamp comparison, whereas advancing first would lose it.
  const recorded: string[] = []
  for (const completion of completions) {
    const written = await recordPolledCompletion(completion)
    if (written) recorded.push(`${completion.characterId}:${completion.questId}`)
  }

  const saved = await savePollerState(nextState, state.lastPollAt)
  if (!saved) {
    console.warn('poll: state advanced by a concurrent run; discarding stale state')
  }

  return { polled: observations.length, completed: completions.length, recorded }
}
