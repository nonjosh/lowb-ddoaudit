import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, ItemAffix, SetsData } from '@/api/ddoGearPlanner'
import { GearSetup, getGearAffixes } from '@/domains/gearPlanner'

interface SummaryTableProps {
  setup: GearSetup
  selectedProperties: string[]
  setsData: SetsData | null
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

// Define bonus type priority
const bonusTypePriority: Record<string, number> = {
  'Enhancement': 1,
  'Insight': 2,
  'Quality': 3,
  'Artifact': 4,
  'Profane': 5
}

function getBonusTypePriority(type: string): number {
  return bonusTypePriority[type] || 999
}

export default function SummaryTable({
  setup,
  selectedProperties,
  setsData
}: SummaryTableProps) {
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Get all affixes including set bonuses and augments
  const allAffixes = getGearAffixes(setup, setsData)

  // Build data structure: property -> bonusType -> {value, slots: [{slot, item, isFromSet, isFromAugment}]}
  interface BonusSource {
    slot: string
    slotName: string
    itemName: string
    isFromSet?: boolean
    isFromAugment?: boolean
  }

  interface BonusTypeData {
    value: number
    sources: BonusSource[]
  }

  const propertyBonuses = new Map<string, Map<string, BonusTypeData>>()

  // Process each slot's item
  slots.forEach(slot => {
    const item = getItemForSlot(setup, slot)
    if (!item) return

    item.affixes.forEach((affix: ItemAffix) => {
      if (affix.type === 'bool' || !selectedProperties.includes(affix.name)) return

      const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
      if (isNaN(value) || typeof value !== 'number') return

      const propertyName = affix.name
      const bonusType = affix.type || 'Untyped'

      if (!propertyBonuses.has(propertyName)) {
        propertyBonuses.set(propertyName, new Map())
      }

      const propertyMap = propertyBonuses.get(propertyName)!
      if (!propertyMap.has(bonusType)) {
        propertyMap.set(bonusType, { value: 0, sources: [] })
      }

      const bonusData = propertyMap.get(bonusType)!

      // For same bonus type, only keep highest value but track all sources
      if (value > bonusData.value) {
        bonusData.value = value
      }

      // Check if this is from an augment slot
      const isFromAugment = affix.name.toLowerCase().includes('augment slot')

      bonusData.sources.push({
        slot,
        slotName: slotDisplayNames[slot],
        itemName: item.name,
        isFromAugment
      })
    })
  })

  // Process set bonuses
  // TODO: Track which items are part of sets and mark set bonuses appropriately

  // Calculate totals for each property
  const propertyTotals = new Map<string, number>()
  selectedProperties.forEach(property => {
    let total = 0
    const bonusMap = propertyBonuses.get(property)
    if (bonusMap) {
      bonusMap.forEach(data => {
        total += data.value
      })
    }
    propertyTotals.set(property, total)
  })

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Property Breakdown
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Bonus Type</TableCell>
              {selectedProperties.map(property => (
                <TableCell key={property} align="right">
                  {property}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Get all unique bonus types across all properties and sort them */}
            {Array.from(
              new Set(
                Array.from(propertyBonuses.values()).flatMap(map =>
                  Array.from(map.keys())
                )
              )
            ).sort((a, b) => getBonusTypePriority(a) - getBonusTypePriority(b)).map(bonusType => (
              <TableRow key={bonusType}>
                <TableCell>{bonusType}</TableCell>
                {selectedProperties.map(property => {
                  const bonusData = propertyBonuses.get(property)?.get(bonusType)

                  if (!bonusData || bonusData.value === 0) {
                    return <TableCell key={property} align="right">-</TableCell>
                  }

                  // Create tooltip content showing all sources with values
                  // Find the highest value source to highlight it
                  const maxValue = Math.max(...bonusData.sources.map(s => {
                    const item = getItemForSlot(setup, s.slot)
                    if (!item) return 0
                    const affix = item.affixes.find(a =>
                      a.name === property && a.type === bonusType
                    )
                    if (!affix || affix.type === 'bool') return 0
                    const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
                    return isNaN(value) ? 0 : value
                  }))

                  const tooltipContent = (
                    <Box>
                      {bonusData.sources.map((source, idx) => {
                        const item = getItemForSlot(setup, source.slot)
                        let value = 0
                        if (item) {
                          const affix = item.affixes.find(a =>
                            a.name === property && a.type === bonusType
                          )
                          if (affix && affix.type !== 'bool') {
                            const val = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
                            if (!isNaN(val)) value = val
                          }
                        }
                        const isStacking = value === maxValue
                        return (
                          <Typography
                            key={idx}
                            variant="caption"
                            display="block"
                            sx={{
                              fontWeight: isStacking ? 'bold' : 'normal',
                              color: isStacking ? 'primary.light' : 'inherit'
                            }}
                          >
                            {source.slotName}: {source.itemName} (+{value})
                            {source.isFromAugment && ' (Augment)'}
                            {source.isFromSet && ' (Set Bonus)'}
                          </Typography>
                        )
                      })}
                    </Box>
                  )

                  return (
                    <TableCell key={property} align="right">
                      <Tooltip title={tooltipContent} arrow>
                        <span style={{ cursor: 'help' }}>
                          +{bonusData.value}
                        </span>
                      </Tooltip>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            <TableRow sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>
              <TableCell>
                <strong>Total</strong>
              </TableCell>
              {selectedProperties.map(property => (
                <TableCell key={property} align="right">
                  <strong>+{propertyTotals.get(property) || 0}</strong>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
