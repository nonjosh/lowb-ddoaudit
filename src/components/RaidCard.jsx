import { EXPECTED_PLAYERS, groupEntriesByPlayer, isEntryAvailable } from '../raidLogic'
import { getRaidNotesForRaidName } from '../raidNotes'
import RaidPlayerGroup from './RaidPlayerGroup'
import { Card, CardHeader, CardContent, Collapse, IconButton, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoIcon from '@mui/icons-material/Info'

export default function RaidCard({ raidGroup, now, isRaidCollapsed, onToggleRaid, isPlayerCollapsed, onTogglePlayer }) {
  const g = raidGroup
  const perPlayer = groupEntriesByPlayer(g.entries, now)
  const raidNotes = getRaidNotesForRaidName(g.raidName)

  const renderNotesField = (label, items) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : []
    if (list.length === 0) return null
    return (
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>{label}:</Typography>
        <Box>
          {list.map((x, idx) => (
            <Typography key={idx} variant="body2" component="div">{x}</Typography>
          ))}
        </Box>
      </Box>
    )
  }

  const isEligibleEntry = (e) => {
    const lvl = e?.totalLevel
    return typeof lvl !== 'number' || lvl >= 30
  }

  const perPlayerEligible = perPlayer
    .map((pg) => ({ ...pg, entries: (pg.entries ?? []).filter(isEligibleEntry) }))
    .filter((pg) => (pg.entries ?? []).length > 0)

  const availablePlayers = EXPECTED_PLAYERS.filter((playerName) => {
    const pg = perPlayerEligible.find((p) => p.player === playerName)
    return pg ? (pg.entries ?? []).some((e) => isEntryAvailable(e, now)) : false
  }).length

  return (
    <Card sx={{ mb: 2 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6">{g.raidName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Level: {typeof g.questLevel === 'number' ? g.questLevel : '—'} · Quest ID: {g.questId}
            </Typography>
          </Box>
        }
        subheader={
          <Typography variant="body2" color={availablePlayers === EXPECTED_PLAYERS.length ? 'success.main' : 'text.secondary'}>
            Available players: {availablePlayers}/{EXPECTED_PLAYERS.length}
          </Typography>
        }
      />
      
      <Collapse in={!isRaidCollapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {raidNotes ? (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              {renderNotesField('Augment', raidNotes.augments)}
              {renderNotesField('Set', raidNotes.sets)}
              {renderNotesField('Notes', raidNotes.notes)}
            </Box>
          ) : null}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Character</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Classes</TableCell>
                  <TableCell>Time remaining</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {perPlayerEligible.map((pg) => {
                  const collapsed = isPlayerCollapsed(g.questId, pg.player)
                  return (
                    <RaidPlayerGroup
                      key={pg.player}
                      playerGroup={pg}
                      now={now}
                      collapsed={collapsed}
                      onToggleCollapsed={() => onTogglePlayer(g.questId, pg.player)}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Collapse>
    </Card>
  )
}
