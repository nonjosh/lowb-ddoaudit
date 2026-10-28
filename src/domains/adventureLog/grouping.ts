import type { Quest } from '@/api/ddoAudit'
import groupingsData from '@/data/questGroupings.json'

interface GroupingEntry {
  saga?: string
  pack?: string
}

export type QuestBand = 'Heroic' | 'Epic' | 'Legendary'

export interface QuestGroup {
  id: string
  label: string
  kind: 'saga' | 'pack' | 'level'
  band?: QuestBand
  level?: number
  quests: Quest[]
}

const BAND_ORDER: Record<QuestBand, number> = { Heroic: 0, Epic: 1, Legendary: 2 }
const KIND_ORDER = { saga: 0, pack: 1, level: 2 } as const

/**
 * Quest -> saga / adventure pack, snapshotted in `scripts/build-quest-groupings.ts`
 * from `sagas.json` plus the DDO Audit quest list. Kept in the repo so grouping does
 * not change when the upstream API does; unknown ids fall back to the live field.
 */
const CACHED_GROUPINGS: Record<string, GroupingEntry> = (
  groupingsData as { quests: Record<string, GroupingEntry> }
).quests

export function getSagaName(quest: Quest): string | undefined {
  return CACHED_GROUPINGS[quest.id]?.saga
}

export function getPackName(quest: Quest): string | null {
  return CACHED_GROUPINGS[quest.id]?.pack ?? quest.required_adventure_pack ?? null
}

/** A quest is heroic when it has a heroic version at all, otherwise epic/legendary by CR. */
export function getQuestBand(quest: Quest): QuestBand | null {
  if (quest.heroicLevel !== null) return 'Heroic'
  if (quest.epicLevel === null) return null
  return quest.epicLevel >= 30 ? 'Legendary' : 'Epic'
}

export function listAdventurePacks(quests: Quest[]): string[] {
  const packs = new Set<string>()
  for (const quest of quests) {
    const pack = getPackName(quest)
    if (pack) packs.add(pack)
  }
  return [...packs].sort((left, right) => left.localeCompare(right))
}

function sortQuests(quests: Quest[]): Quest[] {
  return [...quests].sort(
    (left, right) => (left.level ?? 0) - (right.level ?? 0) || left.name.localeCompare(right.name),
  )
}

function sortGroups(groups: QuestGroup[]): QuestGroup[] {
  return groups.sort((left, right) => {
    const byKind = KIND_ORDER[left.kind] - KIND_ORDER[right.kind]
    if (byKind !== 0) return byKind

    if (left.kind === 'level') return (left.level ?? 0) - (right.level ?? 0)

    const byLabel = left.label.localeCompare(right.label)
    if (byLabel !== 0) return byLabel
    if (left.kind === 'pack') {
      return (BAND_ORDER[left.band ?? 'Heroic'] ?? 9) - (BAND_ORDER[right.band ?? 'Heroic'] ?? 9)
    }
    return 0
  })
}

/**
 * Grouping order: saga, then adventure pack (heroic/epic/legendary separate),
 * then level for quests that belong to neither. Hidden packs are dropped entirely.
 */
export function groupQuests(quests: Quest[], hiddenPacks: ReadonlySet<string> = new Set()): QuestGroup[] {
  const groups = new Map<string, QuestGroup>()

  for (const quest of quests) {
    const pack = getPackName(quest)
    if (pack && hiddenPacks.has(pack)) continue

    const saga = getSagaName(quest)
    let group: QuestGroup

    if (saga) {
      group = { id: `saga:${saga}`, label: saga, kind: 'saga', quests: [] }
    } else if (pack) {
      const band = getQuestBand(quest)
      group = {
        id: `pack:${pack}:${band ?? 'Unknown'}`,
        label: pack,
        kind: 'pack',
        ...(band ? { band } : {}),
        quests: [],
      }
    } else {
      group = {
        id: `level:${quest.level ?? 'unknown'}`,
        label: quest.level === null ? 'Unknown level' : `Level ${quest.level}`,
        kind: 'level',
        ...(quest.level === null ? {} : { level: quest.level }),
        quests: [],
      }
    }

    const existing = groups.get(group.id)
    if (existing) existing.quests.push(quest)
    else groups.set(group.id, { ...group, quests: [quest] })
  }

  return sortGroups([...groups.values()]).map((group) => ({
    ...group,
    quests: sortQuests(group.quests),
  }))
}

export function groupLabel(group: QuestGroup): string {
  return group.kind === 'pack' && group.band ? `${group.label} · ${group.band}` : group.label
}
