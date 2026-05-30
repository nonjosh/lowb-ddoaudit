import DiamondIcon from '@mui/icons-material/Diamond'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
  Divider
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById } from '@/api/ddoAudit'
import ItemLootButton from '@/components/items/ItemLootButton'
import RaidTimerTable from '@/components/raids/RaidTimerTable'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import RaidNotesDisplay from '@/components/shared/RaidNotesDisplay'
import RaidTrainAvailability from '@/components/shared/RaidTrainAvailability'
import { useTrove } from '@/contexts/useTrove'
import { getRaidNotesForRaidName } from '@/domains/raids/raidNotes'
import { getRuneNamesForRaid } from '@/domains/raids/raidRunes'
import { detectRaidTrain } from '@/domains/raids/raidTrainLogic'

import LfmParticipantsTable from './LfmParticipantsTable'
import { LfmParticipantsDialogProps } from './types'

interface ExtendedLfmParticipantsDialogProps extends LfmParticipantsDialogProps {
  onGuildClick?: (guildName: string) => void
}

const ALL_DDO_CLASSES = [
  'Alchemist', 'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Favored Soul', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

const normalizeClassName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ')

export default function LfmParticipantsDialog({ selectedLfm, onClose, selectedRaidData, raidGroups, onGuildClick }: ExtendedLfmParticipantsDialogProps) {
  const [areas, setAreas] = useState<Record<string, { name: string }>>({})
  const [now, setNow] = useState(() => new Date())
  const { inventoryMap } = useTrove()
  const acceptedClassSet = useMemo(() => {
    const accepted = selectedLfm?.acceptedClasses ?? []
    if (!accepted.length) {
      // Empty accepted_classes is treated as unrestricted.
      return new Set(ALL_DDO_CLASSES.map(normalizeClassName))
    }
    return new Set(accepted.map(normalizeClassName))
  }, [selectedLfm?.acceptedClasses])
  const hasSkippedClassRestrictions = useMemo(
    () => ALL_DDO_CLASSES.some((className) => !acceptedClassSet.has(normalizeClassName(className))),
    [acceptedClassSet],
  )

  const formatAcceptedLevelRange = (minLevel: number | null | undefined, maxLevel: number | null | undefined): string => {
    if (typeof minLevel === 'number' && typeof maxLevel === 'number') {
      return minLevel === maxLevel ? `Accepted Lv ${minLevel}` : `Accepted Lv ${minLevel}-${maxLevel}`
    }
    if (typeof minLevel === 'number') return `Accepted Lv ${minLevel}+`
    if (typeof maxLevel === 'number') return `Accepted Lv up to ${maxLevel}`
    return 'Accepted Lv —'
  }

  // Count available runes for this raid from Trove inventory
  const runeInfo = useMemo(() => {
    if (!selectedLfm?.questName) return null
    const runeNames = getRuneNamesForRaid(selectedLfm.questName)
    if (runeNames.length === 0 || inventoryMap.size === 0) return null
    const entries: { name: string; count: number; iconSource?: string }[] = []
    for (const runeName of runeNames) {
      const locations = inventoryMap.get(runeName)
      if (locations && locations.length > 0) {
        const total = locations.reduce((sum, loc) => sum + (loc.quantity ?? 1), 0)
        const iconSource = locations.find((loc) => loc.iconSource)?.iconSource
        entries.push({ name: runeName, count: total, iconSource })
      }
    }
    return entries.length > 0 ? entries : null
  }, [selectedLfm?.questName, inventoryMap])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000) // Update every minute
    return () => clearInterval(id)
  }, [])

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
    const nowMs = now.getTime()
    const updateMs = Date.parse(postedAt)
    if (isNaN(updateMs)) return null
    const diffMs = nowMs - updateMs
    return Math.max(0, Math.round(diffMs / 1000 / 60))
  }

  const initialCollapsedPlayers = useMemo(() => {
    if (!selectedRaidData?.perPlayerEligible) return new Set<string>()
    const next = new Set<string>()
    for (const pg of selectedRaidData.perPlayerEligible) {
      next.add(pg.player)
    }
    return next
  }, [selectedRaidData])

  const [collapsedPlayers, setCollapsedPlayers] = useState(initialCollapsedPlayers)

  useEffect(() => {
    setCollapsedPlayers(initialCollapsedPlayers)
  }, [initialCollapsedPlayers])

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

  // Auto-detect raid train from LFM comment, including the current quest
  const detectedTrainRaids = useMemo(() => {
    if (!selectedLfm?.comment || !raidGroups?.length) return []
    const fromComment = detectRaidTrain(selectedLfm.comment, raidGroups)
    if (fromComment.length < 2) return fromComment
    // Include the current LFM's quest if not already in the detected train
    const currentRaid = raidGroups.find((g) => g.questId === selectedLfm.questId)
    if (currentRaid && !fromComment.some((r) => r.questId === currentRaid.questId)) {
      return [currentRaid, ...fromComment]
    }
    return fromComment
  }, [selectedLfm?.comment, selectedLfm?.questId, raidGroups])

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
              {runeInfo && runeInfo.map(({ name, count, iconSource }) => (
                <Tooltip key={name} title={name}>
                  <Chip
                    size="small"
                    avatar={iconSource
                      ? <Avatar src={iconSource} alt={name} />
                      : undefined}
                    icon={!iconSource
                      ? <DiamondIcon sx={{ fontSize: 14 }} />
                      : undefined}
                    label={count}
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                </Tooltip>
              ))}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {typeof selectedLfm?.questLevel === 'number'
                  ? `Quest Lv ${selectedLfm.questLevel}`
                  : 'Quest Lv —'}
              </Typography>
              {selectedLfm?.difficultyDisplay && (
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: selectedLfm.difficultyColor || 'text.primary' }}
                >
                  {selectedLfm.difficultyDisplay}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
              <Typography variant="body2" color="text.secondary">
                {formatAcceptedLevelRange(selectedLfm?.minLevel, selectedLfm?.maxLevel)}
              </Typography>
              {hasSkippedClassRestrictions ? (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">Classes:</Typography>
                  <Box component="span" role="list" aria-label="Accepted classes" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
                    {ALL_DDO_CLASSES.map((className) => {
                      const accepted = acceptedClassSet.has(normalizeClassName(className))
                      return (
                        <Tooltip key={className} title={`${className}${accepted ? '' : ' (excluded)'}`}>
                          <Box
                            component="span"
                            role="listitem"
                            aria-label={`${className} ${accepted ? 'accepted' : 'excluded'}`}
                            sx={{
                              position: 'relative',
                              display: 'inline-flex',
                              width: 20,
                              height: 20,
                              opacity: accepted ? 1 : 0.4,
                              filter: accepted ? 'none' : 'grayscale(1)',
                            }}
                          >
                            <Box
                              component="img"
                              src={`${import.meta.env.BASE_URL}class-icons/${className.toLowerCase().replace(/\s+/g, '-')}.png`}
                              alt={className}
                              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                            {!accepted ? (
                              <Typography
                                component="span"
                                aria-hidden="true"
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  fontSize: 10,
                                  lineHeight: 1,
                                  fontWeight: 700,
                                  color: 'error.main',
                                  textShadow: '0 0 2px #fff',
                                  userSelect: 'none',
                                  pointerEvents: 'none',
                                }}
                              >
                                ×
                              </Typography>
                            ) : null}
                          </Box>
                        </Tooltip>
                      )
                    })}
                  </Box>
                </Stack>
              ) : null}
              {typeof selectedLfm?.adventureActiveMinutes === 'number' ? (
                <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600 }}>
                  Active {formatDuration(selectedLfm.adventureActiveMinutes)}
                </Typography>
              ) : null}
              {(() => {
                const postedMinutes = getPostedMinutes(selectedLfm?.postedAt ?? null)
                return typeof postedMinutes === 'number' ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Posted {formatDuration(postedMinutes)} ago
                  </Typography>
                ) : null
              })()}
            </Stack>
          </Stack>
          {selectedLfm?.comment && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic' }}>
                "{selectedLfm.comment}"
              </Typography>
            </Box>
          )}
        </Box>
        {selectedLfm?.isRaid && (
          <RaidNotesDisplay raidNotes={getRaidNotesForRaidName(selectedLfm.questName ?? '')} />
        )}
      </DialogTitle>
      <DialogContent dividers>
        <LfmParticipantsTable participants={selectedLfm?.participants ?? []} areas={areas} onGuildClick={onGuildClick} leaderGuildName={selectedLfm?.leaderGuildName ?? ''} />
        {selectedLfm?.isRaid && selectedRaidData && detectedTrainRaids.length < 2 ? (
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
        {detectedTrainRaids.length >= 2 && (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Raid Train Detected ({detectedTrainRaids.length} raids)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {detectedTrainRaids.map((r, idx) => (
                <span key={r.questId}>
                  {idx > 0 && ' → '}
                  {r.questId === selectedLfm?.questId ? (
                    <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
                      {r.raidName}
                    </Typography>
                  ) : (
                    r.raidName
                  )}
                </span>
              ))}
            </Typography>
            <RaidTrainAvailability selectedRaids={detectedTrainRaids} now={now} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
