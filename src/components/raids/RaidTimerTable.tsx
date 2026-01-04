import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'

import RaidPlayerGroup from './RaidPlayerGroup'

interface RaidTimerTableProps {
  perPlayerEligible: any[]
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  onTogglePlayer: (questId: string, playerName: string) => void
  questId: string
}

export default function RaidTimerTable({
  perPlayerEligible,
  isPlayerCollapsed,
  onTogglePlayer,
  questId,
}: RaidTimerTableProps) {
  const handleTogglePlayer = (playerName: string) => {
    onTogglePlayer(questId, playerName)
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Character</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Classes</TableCell>
            <TableCell>Race</TableCell>
            <TableCell>Time remaining</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {perPlayerEligible.map((pg) => {
            const collapsed = isPlayerCollapsed(questId, pg.player)
            return (
              <RaidPlayerGroup
                key={pg.player}
                playerGroup={pg}
                collapsed={collapsed}
                onToggleCollapsed={handleTogglePlayer}
              />
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
