import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'

import { fetchAreasById } from '@/api/ddoAudit'
import ItemLootButton from '@/components/items/ItemLootButton'
import RaidTimerTable from '@/components/raids/RaidTimerTable'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useConfig } from '@/contexts/ConfigContext'
import LfmParticipantsTable from './LfmParticipantsTable'
import { LfmParticipantsDialogProps } from './types'

export default function LfmParticipantsDialog({ selectedLfm, onClose, selectedRaidData }: LfmParticipantsDialogProps) {
  const { showClassIcons } = useConfig()
  const [areas, setAreas] = useState<Record<string, { name: string }>>({})
  const [collapsedPlayers, setCollapsedPlayers] = useState<Set<string>>(new Set())

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getPostedMinutes = (postedAt: string | null): number | null => {
    if (!postedAt) return null
    const nowMs = Date.now()
    const updateMs = Date.parse(postedAt)
    if (isNaN(updateMs)) return null
    const diffMs = nowMs - updateMs
    return Math.max(0, Math.round(diffMs / 1000 / 60))
  }

  useEffect(() => {
    if (selectedRaidData?.perPlayerEligible) {
      const next = new Set<string>()
      for (const pg of selectedRaidData.perPlayerEligible) {
        next.add(pg.player)
      }
      setCollapsedPlayers(next)
    }
  }, [selectedRaidData])

  const isPlayerCollapsed = (_questId: string, playerName: string) => collapsedPlayers.has(playerName)

  const onTogglePlayer = (_questId: string, playerName: string) => {
    setCollapsedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(playerName)) {
        next.delete(playerName)
      } else {
        next.add(playerName)
      }
      return next
    })
  }

  useEffect(() => {
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  return (
    <Dialog open={Boolean(selectedLfm)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h6" component="div">
                {selectedLfm?.questName || 'LFM Group'}
                {selectedLfm && (
                  <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                    ({selectedLfm.participants.length}/{selectedLfm.maxPlayers ?? 6})
                  </Typography>
                )}
              </Typography>
              {selectedLfm?.questName && <ItemLootButton questName={selectedLfm.questName} />}
              {selectedLfm?.questName && <DdoWikiLink questName={selectedLfm.questName} />}
            </Box>
            {selectedLfm?.adventurePack && (
              <Typography variant="caption" color="text.secondary">
                {selectedLfm.adventurePack}
              </Typography>
            )}
          </Stack>
          {selectedLfm?.areaId && areas && areas[selectedLfm.areaId]?.name && (
            <Typography variant="body2" color="text.secondary">
              {areas && areas[selectedLfm.areaId]?.name}
            </Typography>
          )}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {typeof selectedLfm?.questLevel === 'number'
                  ? `Quest Lv ${selectedLfm.questLevel}`
                  : 'Quest Lv —'}
              </Typography>
              {selectedLfm?.difficultyDisplay && (
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: selectedLfm.difficultyColor || 'text.primary' }}
                >
                  {selectedLfm.difficultyDisplay}
                </Typography>
              )}
            </Stack>
            <Stack direction="column" alignItems="flex-end" spacing={0.5}>
              {typeof selectedLfm?.adventureActiveMinutes === 'number' ? (
                <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 600 }}>
                  Active {formatDuration(selectedLfm.adventureActiveMinutes)}
                </Typography>
              ) : null}
              {(() => {
                const postedMinutes = getPostedMinutes(selectedLfm?.postedAt ?? null)
                return typeof postedMinutes === 'number' ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Posted {formatDuration(postedMinutes)} ago
                  </Typography>
                ) : null
              })()}
            </Stack>
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <LfmParticipantsTable participants={selectedLfm?.participants ?? []} areas={areas} />
        {selectedLfm?.isRaid && selectedRaidData ? (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Raid Timers
            </Typography>
            <RaidTimerTable
              perPlayerEligible={selectedRaidData.perPlayerEligible}
              isPlayerCollapsed={isPlayerCollapsed}
              onTogglePlayer={onTogglePlayer}
              questId={selectedLfm.questId}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
