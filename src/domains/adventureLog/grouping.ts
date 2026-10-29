import type { Quest } from '@/api/ddoAudit'
import groupingsData from '@/data/questGroupings.json'

interface GroupingEntry {
  sagas?: string[]
  pack?: string
  /** Upstream lists adventure areas as quests; the page hides them. */
  wilderness?: boolean
}

interface GroupingFile {
  quests: Record<string, GroupingEntry>
  /** Saga name -> version, derived from its level range (some "(Epic)" sagas are legendary). */
  sagaBands?: Record<string, QuestBand>
}

export type QuestBand = 'heroic' | 'epic' | 'legendary'

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

export interface GroupOptions {
  /**
   * 'packs' ignores sagas entirely and groups by adventure pack, then level.
   * 'sagas' groups by saga only (one row can appear in several sagas).
   */
  mode?: 'packs' | 'sagas'
}

/**
 * Quest -> sagas / adventure pack, snapshotted in `scripts/build-quest-groupings.ts`
 * from `sagas.json` plus the DDO Audit quest list. Kept in the repo so grouping does
 * not change when the upstream API does; unknown ids fall back to the live field.
 */
const GROUPINGS = groupingsData as GroupingFile
const CACHED_GROUPINGS: Record<string, GroupingEntry> = GROUPINGS.quests
const SAGA_BANDS: Record<string, QuestBand> = GROUPINGS.sagaBands ?? {}

export function getSagaNames(quest: Quest): string[] {
  return CACHED_GROUPINGS[quest.id]?.sagas ?? []
}

/** True for upstream records that are adventure areas, not instanced quests. */
export function isWildernessQuest(quest: Quest): boolean {
  return CACHED_GROUPINGS[quest.id]?.wilderness === true
}

export function getPackName(quest: Quest): string | null {
  return CACHED_GROUPINGS[quest.id]?.pack ?? quest.required_adventure_pack ?? null
}

export function bandLabel(band: QuestBand): string {
  return BAND_LABELS[band]
}

/** Level bands: 30+ is legendary, 21-29 epic, the rest heroic. */
export function bandForLevelNumber(level: number | null): QuestBand | null {
  if (level === null) return null
  return level >= 30 ? 'legendary' : level >= 21 ? 'epic' : 'heroic'
}

/**
 * Version of a saga. The cache carries the band derived from each saga's level
 * range, because a couple of legendary sagas are named "(Epic)" on the wiki.
 */
function sagaBand(sagaName: string): QuestBand | null {
  const cached = SAGA_BANDS[sagaName]
  if (cached) return cached
  if (/\(heroic\)/i.test(sagaName)) return 'heroic'
  if (/\(legendary\)/i.test(sagaName)) return 'legendary'
  if (/\(epic\)/i.test(sagaName)) return 'epic'
  return null
}

/** Sagas this row belongs to; a "(Heroic)" saga only takes the heroic version. */
export function sagaGroupNamesForRow(quest: Quest, band: QuestBand): string[] {
  return getSagaNames(quest).filter((name) => {
    const required = sagaBand(name)
    return required === null || required === band
  })
}

/** Playable versions of a quest: heroic, epic and/or legendary. */
export function questVersions(quest: Quest): Array<{ band: QuestBand; level: number | null }> {
  // The challenge "- EPIC" records report the same heroic and epic CR; that is one
  // epic version, not two, so treat it as such instead of listing it twice.
  if (quest.heroicLevel !== null && quest.epicLevel !== null && quest.heroicLevel === quest.epicLevel) {
    return [{ band: quest.epicLevel >= 30 ? 'legendary' : 'epic', level: quest.epicLevel }]
  }

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
  return group.levelMin === group.levelMax ? `${group.levelMin}` : `${group.levelMin}–${group.levelMax}`
}

const isRaid = (row: QuestRowModel): boolean => row.quest.type === 'Raid'

/**
 * Groups by adventure pack (split by version), then level, or by saga when asked.
 * Groups are ordered by their highest level, descending; at the same level a raid
 * pack follows a normal one. Inside a group, raid quests come last.
 */
export function groupQuestRows(
  rows: QuestRowModel[],
  hiddenPacks: ReadonlySet<string> = new Set(),
  options: GroupOptions = {},
): QuestGroup[] {
  const groups = new Map<string, QuestGroup>()

  for (const row of rows) {
    const pack = getPackName(row.quest)
    if (pack && hiddenPacks.has(pack)) continue

    const sagaNames =
      options.mode === 'sagas' ? sagaGroupNamesForRow(row.quest, row.band) : []
    const targets: Array<Pick<QuestGroup, 'id' | 'label' | 'kind' | 'band'>> = []

    if (sagaNames.length > 0) {
      for (const saga of sagaNames) targets.push({ id: `saga:${saga}`, label: saga, kind: 'saga' })
    } else if (pack) {
      targets.push({
        id: `pack:${pack}:${row.band}`,
        label: pack,
        kind: 'pack',
        band: row.band,
      })
    } else {
      targets.push({
        id: `level:${row.level ?? 'unknown'}`,
        label: row.level === null ? 'Unknown level' : `Level ${row.level}`,
        kind: 'level',
      })
    }

    for (const target of targets) {
      const existing = groups.get(target.id)
      if (existing) {
        existing.rows.push(row)
        existing.raid = existing.raid && isRaid(row)
      } else {
        groups.set(target.id, { ...target, levelMin: null, levelMax: null, raid: isRaid(row), rows: [row] })
      }
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      ...levelRange(group.rows),
      rows: [...group.rows].sort(
        (left, right) =>
          Number(isRaid(left)) - Number(isRaid(right)) ||
          (left.level ?? 0) - (right.level ?? 0) ||
          left.quest.name.localeCompare(right.quest.name) ||
          left.band.localeCompare(right.band),
      ),
    }))
    .sort((left, right) => {
      const byLevel = (right.levelMax ?? -1) - (left.levelMax ?? -1)
      if (byLevel !== 0) return byLevel

      const leftRaid = left.kind === 'pack' && left.raid ? 1 : 0
      const rightRaid = right.kind === 'pack' && right.raid ? 1 : 0
      if (leftRaid !== rightRaid) return leftRaid - rightRaid

      const byLabel = left.label.localeCompare(right.label)
      if (byLabel !== 0) return byLabel
      return (left.band ?? '').localeCompare(right.band ?? '')
    })
}

export function groupLabel(group: QuestGroup): string {
  return group.kind === 'pack' && group.band ? `${group.label} · ${bandLabel(group.band)}` : group.label
}

/** What the flat views need from a completion record. */
interface CompletionLike {
  finished?: boolean
  lastFinishedAt?: string | null
}

/**
 * "Recently done": completed rows that have a completion date, newest first, no
 * grouping. A row checked by hand without a date has no "last done" to show, so it is
 * left out rather than sorted to an arbitrary place. `rows` is expected to be the
 * already-filtered set; only hidden packs and search are applied here.
 */
export function recentlyDoneRows(
  rows: QuestRowModel[],
  completions: Record<string, CompletionLike | undefined>,
  query = '',
  hiddenPacks: ReadonlySet<string> = new Set(),
): QuestRowModel[] {
  const needle = query.trim().toLowerCase()
  return rows
    .filter((row) => !hiddenPacks.has(getPackName(row.quest) ?? ''))
    .filter((row) => {
      const entry = completions[row.key]
      return entry?.finished === true && Boolean(entry.lastFinishedAt)
    })
    .filter((row) => {
      if (!needle) return true
      return [row.quest.name, getPackName(row.quest) ?? '', row.quest.patron ?? ''].some((value) =>
        value.toLowerCase().includes(needle),
      )
    })
    .sort((left, right) => {
      const byDate = (completions[right.key]?.lastFinishedAt ?? '').localeCompare(
        completions[left.key]?.lastFinishedAt ?? '',
      )
      return byDate !== 0 ? byDate : left.quest.name.localeCompare(right.quest.name)
    })
}
