import { config } from './config.js'
import { applyObservations, resolveArea, type PlayerSnapshot } from './detect.js'
import { fetchObservations, fetchServerRoster, getCatalog, type RosterCharacter } from './ddo.js'
import {
  loadPollerState,
  recordPolledCompletion,
  recordReincarnation,
  resetCompletionsForLife,
  savePollerState,
} from './store.js'

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

/** A failed roster only costs the co-player list of that tick; never abort the poll. */
async function loadRoster(): Promise<RosterCharacter[]> {
  try {
    return await fetchServerRoster(config.serverName)
  } catch (error) {
    console.warn('poll: roster fetch failed', error)
    return []
  }
}

function buildPlayersByArea(roster: RosterCharacter[]): Map<string, PlayerSnapshot[]> {
  const byArea = new Map<string, PlayerSnapshot[]>()
  for (const member of roster) {
    if (!member.areaId) continue
    const snapshot: PlayerSnapshot = {
      id: member.id,
      name: member.name,
      level: member.level,
      classes: member.classes,
    }
    const bucket = byArea.get(member.areaId)
    if (bucket) bucket.push(snapshot)
    else byArea.set(member.areaId, [snapshot])
  }
  return byArea
}

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

  // The roster is one large response, so it is read only while someone is actually
  // inside a quest: that is the only moment a run can collect co-players.
  const questing = observations.some(
    (observation) =>
      observation.online &&
      resolveArea(observation.areaId, observation.level, catalog, config.levelMargin) !== null,
  )
  const playersByArea = buildPlayersByArea(questing ? await loadRoster() : [])

  const {
    state: nextState,
    completions,
    reincarnations,
  } = applyObservations(state, observations, now, catalog, {
    minSamples: config.minSamples,
    levelMargin: config.levelMargin,
    playersByArea,
  })

  // Record before advancing state: a failed write is retried on the next tick and
  // deduped by the timestamp comparison, whereas advancing first would lose it.
  const recorded: string[] = []
  for (const completion of completions) {
    const written = await recordPolledCompletion(completion)
    if (written) recorded.push(`${completion.characterId}:${completion.questId}`)
  }

  // Reincarnations are applied after the new completions so this life's runs stay
  // checked while everything older is unchecked (history is preserved either way).
  for (const reincarnation of reincarnations) {
    const { recorded, effectiveAt } = await recordReincarnation(
      reincarnation.characterId,
      reincarnation.at,
      'auto',
    )
    if (!recorded) continue
    const reset = await resetCompletionsForLife(reincarnation.characterId, effectiveAt, 'auto')
    console.log(
      `poll: reincarnation ${reincarnation.characterId} at ${reincarnation.at.toISOString()} (unchecked ${reset})`,
    )
  }

  const saved = await savePollerState(nextState, state.lastPollAt)
  if (!saved) {
    console.warn('poll: state advanced by a concurrent run; discarding stale state')
  }

  return { polled: observations.length, completed: completions.length, recorded }
}
