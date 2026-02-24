import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ListAltIcon from '@mui/icons-material/ListAlt'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { addMs, formatTimeRemaining, RAID_LOCKOUT_MS } from '@/api/ddoAudit'
import ItemLootButton from '@/components/items/ItemLootButton'
import ClassDisplay from '@/components/shared/ClassDisplay'
import RaidNotesDisplay from '@/components/shared/RaidNotesDisplay'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useConfig } from '@/contexts/useConfig'
import { useWishlist } from '@/contexts/useWishlist'
import { getPlayerDisplayName, groupEntriesByPlayer, isEntryAvailable, RaidEntry, RaidGroup } from '@/domains/raids/raidLogic'
import { getRaidNotesForRaidName } from '@/domains/raids/raidNotes'
import { getRaidUpdate } from '@/domains/raids/raidUpdates'

import RaidTimerTable from './RaidTimerTable'

interface RaidCardProps {
  raidGroup: RaidGroup
  isRaidCollapsed: boolean
  onToggleRaid: () => void
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  onTogglePlayer: (questId: string, playerName: string) => void
  hasFriendInside?: boolean
  hasLfm?: boolean
  onLfmClick?: (questId: string) => void
}

export default function RaidCard({ raidGroup: g, isRaidCollapsed, onToggleRaid, isPlayerCollapsed, onTogglePlayer, hasFriendInside, hasLfm, onLfmClick }: RaidCardProps) {
  const { hasWishForQuestName } = useWishlist()
  const { showClassIcons } = useConfig()

  const [now, setNow] = useState(() => new Date())
  const perPlayer = useMemo(() => groupEntriesByPlayer(g.entries, now), [g.entries, now])
  const [, setIgnoredVersion] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = () => setIgnoredVersion((v) => v + 1)
    window.addEventListener('ddoaudit:ignoredTimersChanged', handler)
    return () => window.removeEventListener('ddoaudit:ignoredTimersChanged', handler)
  }, [])
  const raidNotes = getRaidNotesForRaidName(g.raidName)
  const raidUpdate = getRaidUpdate(g.raidName)

  const friendsInRaid = useMemo(() => {
    const present = new Set<string>((g.entries ?? []).filter((e: RaidEntry) => e?.isInRaid).map((e: RaidEntry) => String(e?.playerName ?? '')))
    return EXPECTED_PLAYERS.filter((p) => present.has(p)).map((p) => getPlayerDisplayName(p))
  }, [g.entries])

  const perPlayerEligible = useMemo(() => {
    const isEligibleEntry = (e: RaidEntry) => {
      const lvl = e?.totalLevel
      return typeof lvl !== 'number' || lvl >= 30
    }

    return perPlayer
      .map((pg) => ({ ...pg, entries: (pg.entries ?? []).filter(isEligibleEntry) }))
      .filter((pg) => (pg.entries ?? []).length > 0)
  }, [perPlayer])

  // Calculate unavailable players with their soonest available character and time
  const unavailablePlayersInfo = useMemo(() => {
    return EXPECTED_PLAYERS
      .map((playerName) => {
        const pg = perPlayerEligible.find((p) => p.player === playerName)
        if (!pg) return null // Player not in raid data

        const hasAvailable = (pg.entries ?? []).some((e) => isEntryAvailable(e, now))
        if (hasAvailable) return null // Player has an available character

        // Find the soonest available entry
        const soonestEntry = (pg.entries ?? [])
          .map((e) => {
            const readyAt = addMs(e.lastTimestamp, RAID_LOCKOUT_MS)
            return { entry: e, readyAt }
          })
          .filter((x) => x.readyAt !== null)
          .sort((a, b) => (a.readyAt!.getTime() - b.readyAt!.getTime()))[0]

        if (!soonestEntry) return null

        const isPlayerOnline = (pg.entries ?? []).some((e) => Boolean(e?.isOnline))

        return {
          playerName,
          displayName: getPlayerDisplayName(playerName),
          soonestCharacter: soonestEntry.entry.characterName,
          soonestClasses: soonestEntry.entry.classes,
          isPlayerOnline,
          readyAt: soonestEntry.readyAt!,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [perPlayerEligible, now])

  const hasPlayersInRaid = useMemo(() => {
    return g.entries.some((e) => e.isInRaid)
  }, [g.entries])

  const allEligibleEntries = useMemo(() => perPlayerEligible.flatMap((pg) => pg.entries ?? []), [perPlayerEligible])
  const allAvailable = useMemo(
    () => allEligibleEntries.length > 0 && allEligibleEntries.every((e) => isEntryAvailable(e, now)),
    [allEligibleEntries, now]
  )
  const shouldShowTable = allEligibleEntries.length > 0 && (!allAvailable || hasPlayersInRaid || hasLfm)

  const highlight = Boolean(hasFriendInside || hasLfm)

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        ...(hasPlayersInRaid ? { borderColor: 'success.main' } : { borderColor: 'transparent' }),
        ...(highlight && {
          boxShadow: (theme) => {
            const primaryColor = theme.palette.primary.main
            return `inset 0 2px 0 0 ${primaryColor}, inset 2px 0 0 0 ${primaryColor}, inset -2px 0 0 0 ${primaryColor}`
          },
        }),
      }}
    >
      <CardHeader
        onClick={onToggleRaid}
        sx={{ cursor: 'pointer' }}
        action={
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              onToggleRaid()
            }}
            aria-label="show more"
            sx={{ transform: !isRaidCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
          >
            <ExpandMoreIcon />
          </IconButton>
        }
        title={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">
                  {raidUpdate && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: 'text.secondary', mr: 0.5 }}
                    >
                      [{raidUpdate}]
                    </Typography>
                  )}
                  {g.raidName}
                </Typography>
                {hasWishForQuestName(g.raidName) ? (
                  <Tooltip title="Contains an item in your wish list">
                    <Box sx={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FavoriteIcon sx={{ width: 18, height: 18, color: 'error.main' }} />
                    </Box>
                  </Tooltip>
                ) : null}
                <ItemLootButton questName={g.raidName} />
              </Box>
              {hasLfm && onLfmClick ? (
                <Tooltip title="View LFM details">
                  <IconButton
                    size="small"
                    sx={{ ml: 0.25, width: 28, height: 28, p: 0, color: 'action.active' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onLfmClick(g.questId)
                    }}
                  >
                    <ListAltIcon sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Level: {typeof g.questLevel === 'number' ? g.questLevel : '—'}
              </Typography>
            </Box>
            {g.adventurePack && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {g.adventurePack}
              </Typography>
            )}
          </Box>
        }
        subheader={
          isRaidCollapsed && (friendsInRaid.length > 0 || unavailablePlayersInfo.length > 0) ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {friendsInRaid.length > 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                    In raid:
                  </Typography>
                ) : null}
                {friendsInRaid.map((f) => (
                  <Chip
                    key={f}
                    size="small"
                    label={f}
                    icon={<FiberManualRecordIcon color="success" sx={{ width: 12, height: 12 }} />}
                    variant="outlined"
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', ml: 'auto' }}>
                {unavailablePlayersInfo.length > 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                    On timer:
                  </Typography>
                ) : null}
                {unavailablePlayersInfo.map((info) => (
                  <Tooltip
                    key={info.playerName}
                    title={
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="caption" color="text.secondary">
                          Soonest available:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <Typography variant="body2">{info.soonestCharacter}</Typography>
                          <ClassDisplay classes={info.soonestClasses} showIcons={showClassIcons} iconSize={18} />
                          <Typography variant="caption" color="text.secondary">
                            · {formatTimeRemaining(info.readyAt.getTime() - now.getTime())}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    arrow
                  >
                    <Chip
                      size="small"
                      label={info.displayName}
                      icon={<FiberManualRecordIcon color={info.isPlayerOnline ? 'success' : 'disabled'} sx={{ width: 12, height: 12 }} />}
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          ) : null
        }
      />

      <Collapse in={!isRaidCollapsed} timeout="auto" unmountOnExit>
        <CardContent>
          <RaidNotesDisplay raidNotes={raidNotes} />

          {shouldShowTable ? (
            <RaidTimerTable
              perPlayerEligible={perPlayerEligible}
              isPlayerCollapsed={isPlayerCollapsed}
              onTogglePlayer={onTogglePlayer}
              questId={g.questId}
            />
          ) : null}
        </CardContent>
      </Collapse>
    </Card>
  )
}
