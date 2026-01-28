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
import { GearCraftingSelections, GearSetup, getCraftingAffixes } from '@/domains/gearPlanner'

// Type for hovering on a specific bonus source (property + bonus type cell)
interface HoveredBonusSource {
  property: string
  bonusType: string
  augmentNames?: string[]
}

interface SummaryTableProps {
  setup: GearSetup
  selectedProperties: string[]
  setsData: SetsData | null
  onPropertyHover?: (property: string | null) => void
  onBonusSourceHover?: (source: HoveredBonusSource | null) => void
  hoveredAugment?: string | null
  craftingSelections?: GearCraftingSelections
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
// Enhancement>Insight>Quality>Artifact>Profane>Exceptional>Festive>others
const bonusTypePriority: Record<string, number> = {
  'Enhancement': 1,
  'Insight': 2,
  'Quality': 3,
  'Artifact': 4,
  'Profane': 5,
  'Exceptional': 6,
  'Festive': 7,
  'Competence': 8,
  'Untyped': 9
}

function getBonusTypePriority(type: string): number {
  return bonusTypePriority[type] || 999
}

export default function SummaryTable({
  setup,
  selectedProperties,
  onPropertyHover,
  onBonusSourceHover,
  hoveredAugment,
  craftingSelections
}: SummaryTableProps) {
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Build data structure: property -> bonusType -> {value, slots: [{slot, item, isFromSet, isFromAugment}]}
  interface BonusSource {
    slot: string
    slotName: string
    itemName: string
    augmentName?: string
    isFromSet?: boolean
    isFromAugment?: boolean
    sourceValue: number
  }

  interface BonusTypeData {
    value: number
    sources: BonusSource[]
  }

  const propertyBonuses = new Map<string, Map<string, BonusTypeData>>()

  // Helper to add a bonus source
  const addBonusSource = (
    affix: ItemAffix,
    slot: string,
    itemName: string,
    isFromAugment: boolean,
    augmentName?: string
  ) => {
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

    bonusData.sources.push({
      slot,
      slotName: slotDisplayNames[slot],
      itemName,
      augmentName,
      isFromAugment,
      sourceValue: value
    })
  }

  // Process each slot's item affixes
  slots.forEach(slot => {
    const item = getItemForSlot(setup, slot)
    if (!item) return

    // Process item's base affixes
    item.affixes.forEach((affix: ItemAffix) => {
      addBonusSource(affix, slot, item.name, false)
    })

    // Process crafting selections (augments) for this slot
    const selections = craftingSelections?.[slot]
    if (selections) {
      const craftingAffixes = getCraftingAffixes(selections)
      craftingAffixes.forEach(affix => {
        // Find which augment this affix came from
        const augment = selections.find(s => s.option?.affixes?.includes(affix))
        const augmentName = augment?.option?.name
        addBonusSource(affix, slot, item.name, true, augmentName)
      })
    }
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
                <TableCell
                  key={property}
                  align="right"
                  onMouseEnter={() => onPropertyHover?.(property)}
                  onMouseLeave={() => onPropertyHover?.(null)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
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
                  const maxValue = Math.max(...bonusData.sources.map(s => s.sourceValue))
                  // Sort sources by slot order for consistent numbering
                  const sortedSources = [...bonusData.sources].sort((a, b) =>
                    slots.indexOf(a.slot) - slots.indexOf(b.slot)
                  )

                  // Get all augment names that contribute to this cell
                  const augmentNamesInCell = sortedSources
                    .filter(s => s.isFromAugment && s.augmentName)
                    .map(s => s.augmentName!)

                  // Check if this cell should be highlighted because a contributing augment is hovered
                  const isHighlightedByAugment = hoveredAugment && augmentNamesInCell.includes(hoveredAugment)

                  const tooltipContent = (
                    <Box>
                      {sortedSources.map((source, idx) => {
                        const isStacking = source.sourceValue === maxValue
                        // For augments, only show augment name; for items, show numbered slot + item name
                        const slotNumber = slots.indexOf(source.slot) + 1
                        const displayName = source.isFromAugment && source.augmentName
                          ? source.augmentName
                          : `${slotNumber}. ${source.slotName}: ${source.itemName}`
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
                            {displayName} (+{source.sourceValue})
                            {source.isFromAugment && ' (Augment)'}
                            {source.isFromSet && ' (Set Bonus)'}
                          </Typography>
                        )
                      })}
                    </Box>
                  )

                  return (
                    <TableCell
                      key={property}
                      align="right"
                      onMouseEnter={() => {
                        onBonusSourceHover?.({
                          property,
                          bonusType,
                          augmentNames: augmentNamesInCell.length > 0 ? augmentNamesInCell : undefined
                        })
                      }}
                      onMouseLeave={() => onBonusSourceHover?.(null)}
                      sx={{
                        cursor: 'help',
                        backgroundColor: isHighlightedByAugment ? 'action.selected' : 'inherit',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <Tooltip title={tooltipContent} arrow>
                        <span>
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
