import type { Quest } from '@/api/ddoAudit'
import groupingsData from '@/data/questGroupings.json'

interface GroupingEntry {
  saga?: string
  pack?: string
}

export type QuestBand = 'heroic' | 'epic' | 'legendary'

export interface QuestBandLabel {
  key: QuestBand
  label: string
}

const BAND_LABELS: Record<QuestBand, string> = {
  heroic: 'Heroic',
  epic: 'Epic',
  legendary: 'Legendary',
}

/** One row of the table: a specific version of a quest. */
export interface QuestRowModel {
  key: string
  quest: Quest
  band: QuestBand
  level: number | null
}

export interface QuestGroup {
  id: string
  label: string
  kind: 'saga' | 'pack' | 'level'
  band?: QuestBand
  levelMin: number | null
  levelMax: number | null
  /** True when every row in the group is a raid. */
  raid: boolean
  rows: QuestRowModel[]
}

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

/** Sagas are versioned in their own name, e.g. "Saltmarsh (Heroic)". */
function sagaBand(sagaName: string): QuestBand | null {
  if (/\(heroic\)/i.test(sagaName)) return 'heroic'
  if (/\(legendary\)/i.test(sagaName)) return 'legendary'
  if (/\(epic\)/i.test(sagaName)) return 'epic'
  return null
}

export function getPackName(quest: Quest): string | null {
  return CACHED_GROUPINGS[quest.id]?.pack ?? quest.required_adventure_pack ?? null
}

export function bandLabel(band: QuestBand): string {
  return BAND_LABELS[band]
}

/** Playable versions of a quest: heroic, epic and/or legendary. */
export function questVersions(quest: Quest): Array<{ band: QuestBand; level: number | null }> {
  const versions: Array<{ band: QuestBand; level: number | null }> = []
  if (quest.heroicLevel !== null) versions.push({ band: 'heroic', level: quest.heroicLevel })
  if (quest.epicLevel !== null) {
    versions.push({ band: quest.epicLevel >= 30 ? 'legendary' : 'epic', level: quest.epicLevel })
  }
  if (versions.length === 0) versions.push({ band: 'heroic', level: quest.level })
  return versions
}

export function completionKey(questId: string, band: QuestBand): string {
  return `${questId}:${band}`
}

/**
 * Which version a character level belongs to, picked by the nearest version level.
 * Mirrors `bandForLevel` in server/src/bands.ts.
 */
export function bandForCharacter(quest: Quest, level: number | null): QuestBand {
  const versions = questVersions(quest)
  if (level === null || versions.length === 1) return versions[0].band
  return [...versions].sort(
    (left, right) => Math.abs((left.level ?? 0) - level) - Math.abs((right.level ?? 0) - level),
  )[0].band
}

export interface AdventurePackInfo {
  pack: string
  levelMin: number | null
  levelMax: number | null
  questCount: number
}

/** Packs with the level span and quest count of their quests, for the hide dialog. */
export function listAdventurePackInfo(quests: Quest[]): AdventurePackInfo[] {
  const byPack = new Map<string, { levels: number[]; quests: Set<string> }>()

  for (const quest of quests) {
    const pack = getPackName(quest)
    if (!pack) continue

    const entry = byPack.get(pack) ?? { levels: [], quests: new Set<string>() }
    entry.quests.add(quest.id)
    for (const version of questVersions(quest)) {
      if (version.level !== null) entry.levels.push(version.level)
    }
    byPack.set(pack, entry)
  }

  return [...byPack.entries()]
    .map(([pack, entry]) => ({
      pack,
      levelMin: entry.levels.length ? Math.min(...entry.levels) : null,
      levelMax: entry.levels.length ? Math.max(...entry.levels) : null,
      questCount: entry.quests.size,
    }))
    .sort((left, right) => left.pack.localeCompare(right.pack))
}

export function buildQuestRows(quests: Quest[]): QuestRowModel[] {
  const rows: QuestRowModel[] = []
  for (const quest of quests) {
    for (const version of questVersions(quest)) {
      rows.push({
        key: completionKey(quest.id, version.band),
        quest,
        band: version.band,
        level: version.level,
      })
    }
  }
  return rows
}

function levelRange(rows: QuestRowModel[]): { levelMin: number | null; levelMax: number | null } {
  const levels = rows.map((row) => row.level).filter((level): level is number => level !== null)
  if (levels.length === 0) return { levelMin: null, levelMax: null }
  return { levelMin: Math.min(...levels), levelMax: Math.max(...levels) }
}

export function formatLevelRange(group: QuestGroup): string {
  if (group.levelMin === null || group.levelMax === null) return '—'
  return group.levelMin === group.levelMax
    ? `${group.levelMin}`
    : `${group.levelMin}–${group.levelMax}`
}

/**
 * Grouping order: saga, then adventure pack split by version, then level for quests
 * with neither. Groups are ordered by their highest level, descending.
 */
export function groupQuestRows(
  rows: QuestRowModel[],
  hiddenPacks: ReadonlySet<string> = new Set(),
): QuestGroup[] {
  const groups = new Map<string, QuestGroup>()

  for (const row of rows) {
    const pack = getPackName(row.quest)
    if (pack && hiddenPacks.has(pack)) continue

    const sagaName = getSagaName(row.quest)
    // A legendary version of a quest must not land in the "(Heroic)" saga; it falls
    // through to its adventure pack group instead.
    const sagaBandName = sagaName ? sagaBand(sagaName) : null
    const saga = sagaName && (sagaBandName === null || sagaBandName === row.band) ? sagaName : undefined

    let id: string
    let label: string
    let kind: QuestGroup['kind']
    let band: QuestBand | undefined

    if (saga) {
      id = `saga:${saga}`
      label = saga
      kind = 'saga'
    } else if (pack) {
      id = `pack:${pack}:${row.band}`
      label = pack
      kind = 'pack'
      band = row.band
    } else {
      id = `level:${row.level ?? 'unknown'}`
      label = row.level === null ? 'Unknown level' : `Level ${row.level}`
      kind = 'level'
    }

    const isRaid = row.quest.type === 'Raid'
    const existing = groups.get(id)
    if (existing) {
      existing.rows.push(row)
      existing.raid = existing.raid && isRaid
    } else {
      groups.set(id, { id, label, kind, band, levelMin: null, levelMax: null, raid: isRaid, rows: [row] })
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      ...levelRange(group.rows),
      rows: [...group.rows].sort(
        (left, right) =>
          (left.level ?? 0) - (right.level ?? 0) ||
          left.quest.name.localeCompare(right.quest.name) ||
          left.band.localeCompare(right.band),
      ),
    }))
    .sort((left, right) => {
      // Raid adventure packs sit below everything else, then groups go by level.
      const leftRaid = left.kind === 'pack' && left.raid ? 1 : 0
      const rightRaid = right.kind === 'pack' && right.raid ? 1 : 0
      if (leftRaid !== rightRaid) return leftRaid - rightRaid

      const byLevel = (right.levelMax ?? -1) - (left.levelMax ?? -1)
      if (byLevel !== 0) return byLevel
      const byLabel = left.label.localeCompare(right.label)
      if (byLabel !== 0) return byLabel
      return (left.band ?? '').localeCompare(right.band ?? '')
    })
}

export function groupLabel(group: QuestGroup): string {
  return group.kind === 'pack' && group.band ? `${group.label} · ${bandLabel(group.band)}` : group.label
}
