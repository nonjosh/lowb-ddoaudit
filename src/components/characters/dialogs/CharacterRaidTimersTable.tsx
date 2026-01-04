import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchQuestsById, fetchRaidActivity, Quest } from '@/api/ddoAudit'
import TimeRemainingDisplay from '@/components/shared/TimeRemainingDisplay'

interface CharacterRaidTimersTableProps {
  character: any
}

export default function CharacterRaidTimersTable({ character }: CharacterRaidTimersTableProps) {
  const [questsByIdLocal, setQuestsByIdLocal] = useState<Record<string, Quest>>({})
  const [raidActivity, setRaidActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!character?.id) return

    let mounted = true
    setLoading(true)
    setHasFetched(false)

    fetchRaidActivity([character.id])
      .then((activity) => {
        if (!mounted) return
        setRaidActivity(activity)
        setHasFetched(true)
      })
      .catch(() => {
        if (!mounted) return
        setRaidActivity([])
        setHasFetched(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [character?.id])

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

  const timerEntries = useMemo(() => {
    if (!character?.id || !hasFetched) return []

    // Track the latest timestamp for each quest_id
    const questTimers = new Map<string, { questId: string; raidName: string; questLevel: number | null; lastTimestamp: string }>()

    for (const item of raidActivity ?? []) {
      const characterId = String(item?.character_id ?? '')
      if (characterId !== character.id) continue

      const ts = item?.timestamp
      const questIds = item?.data?.quest_ids ?? []

      if (!ts || !Array.isArray(questIds)) continue

      for (const questIdRaw of questIds) {
        const questId = String(questIdRaw)
        if (!questId) continue

        const quest = questsByIdLocal?.[questId]
        const raidName = quest?.name ?? `Unknown quest (${questId})`
        const questLevel = quest?.level ?? null

        if (typeof questLevel === 'number' && questLevel < 20) continue

        const existing = questTimers.get(questId)
        if (!existing || new Date(ts).getTime() > new Date(existing.lastTimestamp).getTime()) {
          questTimers.set(questId, {
            questId,
            raidName,
            questLevel,
            lastTimestamp: ts,
          })
        }
      }
    }

    // Convert map to array and sort by time remaining ascending
    const entries = Array.from(questTimers.values())
    entries.sort((a, b) => {
      const aTime = new Date(a.lastTimestamp).getTime()
      const bTime = new Date(b.lastTimestamp).getTime()
      return aTime - bTime
    })

    return entries
  }, [raidActivity, questsByIdLocal, character, hasFetched, now])

  // Don't render anything if no timers
  if (!timerEntries.length && hasFetched && !loading) {
    return null
  }

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      {loading && !hasFetched && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CircularProgress size={16} />
        </Box>
      )}
      {timerEntries.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Raid Name ({timerEntries.length})</TableCell>
                <TableCell>Time Remaining</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timerEntries.map((entry) => {
                return (
                  <TableRow key={`${entry.questId}-${entry.lastTimestamp}`}>
                    <TableCell>{entry.raidName}</TableCell>
                    <TableCell>
                      <TimeRemainingDisplay
                        characterId={character.id}
                        lastTimestamp={entry.lastTimestamp}
                        available={false}
                        showIgnoreButton={false}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}