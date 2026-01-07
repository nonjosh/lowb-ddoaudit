import TimerIcon from '@mui/icons-material/Timer'
import { Box, Chip, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchQuestsById, LfmItem, Quest } from '@/api/ddoAudit'
import raidNotesRaw from '@/assets/raid_notes.txt?raw'
import LfmParticipantsDialog from '@/components/lfm/LfmParticipantsDialog'
import QuestTierFilter from '@/components/shared/QuestTierFilter'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useCharacter } from '@/contexts/useCharacter'
import { prepareLfmParticipants, PreparedLfmData } from '@/domains/lfm/lfmHelpers'
import { groupEntriesByPlayer, isLevelInTier, RaidGroup } from '@/domains/raids/raidLogic'

import RaidCard from './RaidCard'

interface RaidTimerSectionProps {
  loading: boolean
  hasFetched: boolean
  raidGroups: RaidGroup[]
  isRaidCollapsed: (questId: string) => boolean
  toggleRaidCollapsed: (questId: string) => void
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  togglePlayerCollapsed: (questId: string, playerName: string) => void
}

export default function RaidTimerSection({ loading, hasFetched, raidGroups, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed }: RaidTimerSectionProps) {
  /**
   * Raid sorting rules
   *
   * The UI displays raids in the following preferred order:
   *  1. Raids that contain any of the `EXPECTED_PLAYERS` currently in-raid (friends) — highest priority.
   *  2. Raids that have active LFMs (looking-for-members) — medium priority.
   *  3. All remaining raids — lowest priority.
   *
   * The sort is stable: when two raids have equal priority their original order is preserved.
   */
  const { lfms } = useCharacter()

  const [tierFilter, setTierFilter] = useState('legendary')
  const [questsByIdLocal, setQuestsByIdLocal] = useState<Record<string, Quest>>({})
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let mounted = true
    fetchQuestsById().then((q) => {
      if (!mounted) return
      setQuestsByIdLocal(q ?? {})
    }).catch(() => {
      if (!mounted) return
      setQuestsByIdLocal({})
    })
    return () => { mounted = false }
  }, [])

  const sortedRaidGroups = useMemo(() => {
    const lfmsById = lfms ?? {}
    const initial = raidGroups
      .map((g, idx) => {
        const hasFriendInside = (g.entries ?? []).some((e) => EXPECTED_PLAYERS.includes(e.playerName) && Boolean(e.isInRaid))
        const hasLfm = Boolean(lfmsById[g.questId] || Object.values(lfmsById ?? {}).some((l) => String(l?.quest_id ?? '') === String(g.questId)))
        const hasTimer = (g.entries ?? []).some((e) => Boolean(e?.lastTimestamp))
        return { g, idx, hasFriendInside, hasLfm, hasTimer }
      })

    // Parse raid names from raid_notes.txt (lines starting with "## ") and
    // add placeholder raid groups for any raids mentioned in notes but not
    // present in the API `raidGroups` response. These placeholders allow
    // notes to be displayed even when no API data exists for that raid.
    const notesRaidNames: string[] = []
    if (raidNotesRaw) {
      const re = /^##\s+(.+)$/gm
      let m: RegExpExecArray | null
      while ((m = re.exec(raidNotesRaw)) !== null) {
        const name = (m[1] || '').trim()
        if (name) notesRaidNames.push(name)
      }
    }

    const normalize = (s: string) => String(s ?? '').trim().toLowerCase()
    const existingKeys = new Set(initial.map((it) => normalize(it.g.raidName)))
    const startIdx = initial.length
    notesRaidNames.forEach((rn, i) => {
      const key = normalize(rn)
      if (!existingKeys.has(key)) {
        // Try to look up quest level and pack from fetched quests
        let qLevel: number | null = null
        let pack: string | null = null
        try {
          const found = Object.values(questsByIdLocal ?? {}).find((q) => normalize(String(q?.name)) === key)
          if (found) {
            qLevel = typeof found.level === 'number' ? found.level : null
            pack = found.required_adventure_pack ?? null
          }
        } catch {
          // ignore
        }

        initial.push({
          g: { questId: `notes:${key}`, raidName: rn, adventurePack: pack, questLevel: qLevel, entries: [] },
          idx: startIdx + i,
          hasFriendInside: false,
          hasLfm: false,
          hasTimer: false,
        })
      }
    })

    const list = initial.filter((item) => {
      const isNotesOnly = String(item.g.questId).startsWith('notes:')

      // Determine level for filtering. For notes-only placeholders we use the
      // questLevel that may have been looked up from `questsByIdLocal`.
      const lvl = typeof item.g.questLevel === 'number' ? item.g.questLevel : null

      // If tierFilter is unset or 'all', include everything (including notes-only)
      if (!tierFilter || tierFilter === 'all') return true

      // If this is a notes-only raid and we couldn't determine a level, don't
      // include it for non-'all' filters.
      if (isNotesOnly && lvl === null) return false

      return isLevelInTier(lvl, tierFilter)
    })

    list.sort((a, b) => {
      if (a.hasFriendInside !== b.hasFriendInside) return a.hasFriendInside ? -1 : 1
      if (a.hasLfm !== b.hasLfm) return a.hasLfm ? -1 : 1

      const aLevel = typeof a.g.questLevel === 'number' ? a.g.questLevel : -1
      const bLevel = typeof b.g.questLevel === 'number' ? b.g.questLevel : -1
      if (aLevel !== bLevel) return bLevel - aLevel // higher level first

      if (a.hasTimer !== b.hasTimer) return a.hasTimer ? -1 : 1

      return a.idx - b.idx
    })

    return list.map((x) => x.g)
  }, [raidGroups, lfms, tierFilter, questsByIdLocal])

  const [selectedLfm, setSelectedLfm] = useState<PreparedLfmData | null>(null)
  const [selectedRaidGroup, setSelectedRaidGroup] = useState<RaidGroup | null>(null)

  const selectedRaidData = useMemo(() => {
    if (!selectedRaidGroup) return null
    const perPlayerEligible = groupEntriesByPlayer(selectedRaidGroup.entries, now)
    return { raidGroup: selectedRaidGroup, perPlayerEligible }
  }, [selectedRaidGroup, now])

  const handleLfmClick = (questId: string) => {
    const lfmsById = lfms ?? {}
    let lfm: LfmItem | undefined = lfmsById[questId]
    if (!lfm) {
      lfm = Object.values(lfmsById ?? {}).find((l) => String(l?.quest_id ?? '') === String(questId))
    }
    if (!lfm) return

    const quest = (questsByIdLocal ?? {})[String(lfm?.quest_id ?? '')] ?? null
    const preparedLfm = prepareLfmParticipants(lfm, quest)
    setSelectedLfm(preparedLfm)

    // Find the corresponding raid group
    const raidGroup = sortedRaidGroups.find((g) => g.questId === questId)
    setSelectedRaidGroup(raidGroup || null)
  }
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>Raid Timers</Typography>
        </Box>
        <Chip label={sortedRaidGroups.length} size="small" variant="outlined" />
        {loading && <CircularProgress size={20} />}
        <Box sx={{ ml: 'auto' }}>
          <QuestTierFilter value={tierFilter} onChange={setTierFilter} />
        </Box>
      </Box>
      {!raidGroups.length ? (
        (loading || !hasFetched) ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No raid activity found for those character IDs.
          </Typography>
        )
      ) : (
        <Stack>
          {sortedRaidGroups.map((g) => {
            const lfmsById = lfms ?? {}
            const hasFriendInside = (g.entries ?? []).some((e) => EXPECTED_PLAYERS.includes(e.playerName) && Boolean(e.isInRaid))
            const hasLfm = Boolean(lfmsById[g.questId] || Object.values(lfmsById ?? {}).some((l) => String(l?.quest_id ?? '') === String(g.questId)))
            return (
              <Box key={g.questId}>
                <RaidCard
                  raidGroup={g}
                  isRaidCollapsed={isRaidCollapsed(g.questId)}
                  onToggleRaid={() => toggleRaidCollapsed(g.questId)}
                  isPlayerCollapsed={isPlayerCollapsed}
                  onTogglePlayer={togglePlayerCollapsed}
                  hasFriendInside={hasFriendInside}
                  hasLfm={hasLfm}
                  onLfmClick={(qid) => handleLfmClick(qid)}
                />
              </Box>
            )
          })}
        </Stack>
      )}
      <LfmParticipantsDialog selectedLfm={selectedLfm} onClose={() => setSelectedLfm(null)} selectedRaidData={selectedRaidData} />
    </>
  )
}
