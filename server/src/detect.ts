import { bandForLevel, type QuestBand } from './bands.js'
import type { Catalog, CharacterObservation, QuestRecord } from './ddo.js'

/**
 * Areas that the upstream API labels as wilderness but are actually instanced
 * quest areas. Keep in sync with AREA_PATCHES in src/api/ddoAudit/areas.ts.
 */
export const FORCED_QUEST_AREAS = new Set<string>([
  '1879303679', // Vision of an Alternate History -> Terror of the Demon Lords
])

export interface ResolvedArea {
  quest: QuestRecord
}

export function levelDistance(quest: QuestRecord, level: number): number {
  const cr = level >= 21 ? (quest.epicCr ?? quest.heroicCr) : (quest.heroicCr ?? quest.epicCr)
  return cr === null ? Number.POSITIVE_INFINITY : Math.abs(cr - level)
}

/**
 * Maps an area to the quest being run there.
 * Returns null for hubs, wilderness, and areas that hold several similarly-leveled
 * quests (those need a human, see the ambiguous-area list in the README).
 */
export function resolveArea(
  areaId: string | null,
  level: number | null,
  catalog: Catalog,
  levelMargin: number,
): ResolvedArea | null {
  if (!areaId) return null

  const quests = catalog.byArea.get(areaId)
  if (!quests || quests.length === 0) return null

  // Default-deny: an area missing from the /areas feed is treated as unusable
  // rather than assumed to be a dungeon. Public hubs never run quests either.
  if (!FORCED_QUEST_AREAS.has(areaId)) {
    if (catalog.areaIsPublic.get(areaId) !== false) return null
    if (catalog.areaIsWilderness.get(areaId) !== false) return null
  }

  if (quests.length === 1) return { quest: quests[0] }
  if (level === null) return null

  const scored = quests
    .map((quest) => ({ quest, distance: levelDistance(quest, level) }))
    .sort((left, right) => left.distance - right.distance)

  // Two candidates at (nearly) the same level band cannot be told apart by level.
  // Written this way so candidates with no CR at all (Infinity) fail closed.
  if (!Number.isFinite(scored[0].distance)) return null
  if (!(scored[1].distance - scored[0].distance >= levelMargin)) return null

  return { quest: scored[0].quest }
}

export interface CharacterState {
  areaId: string | null
  since: string
  samples: number
  questId: string | null
  level: number | null
  lastInsideAt: string | null
  /** Consecutive polls where upstream omitted this character. */
  misses?: number
  /**
   * Set when the character level drops hard (20+ -> 5-). Cleared when a low-level
   * quest confirms the reincarnation, or by the poller after a day.
   */
  pendingTrAt?: string | null
}

export interface Reincarnation {
  characterId: string
  at: Date
}

export interface PollerState {
  lastPollAt: string | null
  characters: Record<string, CharacterState>
}

export interface Completion {
  characterId: string
  questId: string
  /** Which version of the quest the run belongs to. */
  band: QuestBand
  exitAt: Date
  level: number | null
}

export function emptyState(): PollerState {
  return { lastPollAt: null, characters: {} }
}

/**
 * Records one poll sample per character and emits a completion for every visit
 * that ended on this tick.
 *
 * A visit counts when the character was seen in a resolvable quest area for at
 * least `minSamples` consecutive polls. The exit timestamp is the last sample
 * where they were still inside, so it is never later than reality by more than
 * one poll interval.
 */
export function applyObservations(
  state: PollerState,
  observations: CharacterObservation[],
  now: Date,
  catalog: Catalog,
  options: { minSamples: number; levelMargin: number },
): { state: PollerState; completions: Completion[]; reincarnations: Reincarnation[] } {
  const characters: Record<string, CharacterState> = { ...state.characters }
  const completions: Completion[] = []
  const reincarnations: Reincarnation[] = []

  for (const observation of observations) {
    const previous = characters[observation.characterId] ?? null

    // One omission is not a logout: hold the state so a transient upstream gap
    // cannot close a visit early (which would also swallow the real exit).
    if (observation.missing && previous && (previous.misses ?? 0) < 1) {
      characters[observation.characterId] = { ...previous, misses: (previous.misses ?? 0) + 1 }
      continue
    }

    const areaId = observation.online ? observation.areaId : null
    const resolved = resolveArea(areaId, observation.level, catalog, options.levelMargin)

    // A hard level drop (20+ down to 5 or less) is a reincarnation candidate; it only
    // becomes one when the character turns up in a low-level quest.
    const previousLevel = previous?.level ?? null
    const droppedToLowLevel =
      previousLevel !== null &&
      previousLevel >= 20 &&
      observation.level !== null &&
      observation.level >= 1 &&
      observation.level <= 5

    // A candidate that is never confirmed expires, so it cannot fire days later.
    const stalePending =
      previous?.pendingTrAt != null && now.getTime() - new Date(previous.pendingTrAt).getTime() > 24 * 60 * 60 * 1000
    const carriedPending = stalePending ? null : (previous?.pendingTrAt ?? null)
    const pendingTrAt = droppedToLowLevel ? now.toISOString() : carriedPending

    const confirmsTr =
      pendingTrAt !== null &&
      resolved !== null &&
      (resolved.quest.heroicCr ?? 99) <= 3 &&
      observation.level !== null &&
      observation.level >= 1 &&
      observation.level <= 5
    if (confirmsTr && pendingTrAt) {
      reincarnations.push({ characterId: observation.characterId, at: new Date(pendingTrAt) })
    }

    const nextPendingTrAt = confirmsTr ? null : pendingTrAt

    if (previous && previous.areaId === areaId) {
      characters[observation.characterId] = {
        ...previous,
        samples: previous.samples + 1,
        misses: 0,
        level: observation.level ?? previous.level,
        pendingTrAt: nextPendingTrAt,
        questId: previous.questId ?? resolved?.quest.id ?? null,
        // Keep the clock running while we still hold a quest for this visit, even
        // if a level change makes the area ambiguous mid-run.
        lastInsideAt:
          resolved || previous.questId ? now.toISOString() : previous.lastInsideAt,
      }
      continue
    }

    if (previous?.questId && previous.samples >= options.minSamples && previous.lastInsideAt) {
      const quest = catalog.questById.get(previous.questId)
      completions.push({
        characterId: observation.characterId,
        questId: previous.questId,
        band: quest ? bandForLevel(quest, previous.level) : 'heroic',
        exitAt: new Date(previous.lastInsideAt),
        level: previous.level,
      })
    }

    characters[observation.characterId] = {
      areaId,
      since: now.toISOString(),
      samples: 1,
      questId: resolved?.quest.id ?? null,
      // Keep the last known level when a poll reports none, so a TR is not missed.
      level: observation.level ?? previous?.level ?? null,
      lastInsideAt: resolved ? now.toISOString() : null,
      misses: 0,
      pendingTrAt: nextPendingTrAt,
    }
  }

  return { state: { lastPollAt: now.toISOString(), characters }, completions, reincarnations }
}
