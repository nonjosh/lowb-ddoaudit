import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'

import { Item } from '@/api/ddoGearPlanner'
import { combineAffixes, GearSetup, getPropertyTotal } from '@/domains/gearPlanner'

interface SummaryTableProps {
  setup: GearSetup
  selectedProperties: string[]
}

const slotDisplayNames: Record<string, string> = {
  armor: 'Armor',
  belt: 'Belt',
  boots: 'Boots',
  bracers: 'Bracers',
  cloak: 'Cloak',
  gloves: 'Gloves',
  goggles: 'Goggles',
  helm: 'Helm',
  necklace: 'Necklace',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  trinket: 'Trinket'
}

function getItemForSlot(setup: GearSetup, slot: string): Item | undefined {
  return setup[slot as keyof GearSetup]
}

export default function SummaryTable({
  setup,
  selectedProperties
}: SummaryTableProps) {
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Calculate contribution of each item to each property
  const slotContributions = slots.map(slot => {
    const item = getItemForSlot(setup, slot)
    const contributions = new Map<string, number>()
    
    if (item) {
      const combined = combineAffixes(item.affixes)
      for (const property of selectedProperties) {
        contributions.set(property, getPropertyTotal(combined, property))
      }
    }
    
    return {
      slot,
      slotName: slotDisplayNames[slot],
      itemName: item?.name || 'Empty',
      contributions
    }
  })

  // Calculate totals
  const totals = new Map<string, number>()
  for (const property of selectedProperties) {
    let total = 0
    for (const slotData of slotContributions) {
      total += slotData.contributions.get(property) || 0
    }
    totals.set(property, total)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Property Breakdown
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Slot</TableCell>
              <TableCell>Item</TableCell>
              {selectedProperties.map(property => (
                <TableCell key={property} align="right">
                  {property}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {slotContributions.map(({ slot, slotName, itemName, contributions }) => (
              <TableRow key={slot}>
                <TableCell>{slotName}</TableCell>
                <TableCell>{itemName}</TableCell>
                {selectedProperties.map(property => {
                  const value = contributions.get(property) || 0
                  return (
                    <TableCell key={property} align="right">
                      {value > 0 ? `+${value}` : '-'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            <TableRow sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>
              <TableCell colSpan={2}>
                <strong>Total</strong>
              </TableCell>
              {selectedProperties.map(property => (
                <TableCell key={property} align="right">
                  <strong>+{totals.get(property) || 0}</strong>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
