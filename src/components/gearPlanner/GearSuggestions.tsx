import React, { useCallback, useMemo, useState } from 'react'

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import FilterListIcon from '@mui/icons-material/FilterList'
import InventoryIcon from '@mui/icons-material/Inventory'
import LayersClearIcon from '@mui/icons-material/LayersClear'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material'

import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import { EvaluatedGearSetup, evaluateGearSetup, GearSetup, PropertyBonusIndex } from '@/domains/gearPlanner'
import { generateSetFocusedVariants, generateSlotSwapVariants, optimizeSetup, SuggestionsOptions } from '@/domains/gearPlanner/suggestions'

interface GearPlan {
  label: string
  setup: GearSetup
  propertyValues: Map<string, number>
  propertyBreakdowns?: Map<string, Map<string, number>>
  unusedAugments?: number
  totalAugments?: number
  activeSets?: number
  otherEffects?: string[]
  extraProperties?: number
}

interface GearSuggestionsProps {
  currentSetup: EvaluatedGearSetup
  selectedProperties: string[]
  items: Item[]
  setsData: SetsData | null
  craftingData: CraftingData | null
  propertyIndex: PropertyBonusIndex
  pinnedSlots: Set<string>
  excludeSetAugments: boolean
  excludedAugments: string[]
  excludedPacks: string[]
  onApplySetup: (setup: GearSetup) => void
  /** Item names available in Trove inventory. Empty set = no Trove data. */
  ownedItemNames: Set<string>
  onExcludeSetAugmentsChange: (exclude: boolean) => void
}

type SortColumn = 'augments' | 'other' | 'sets' | string
type SortDirection = 'asc' | 'desc'

function SortableHeaderCell({
  column,
  label,
  align = 'left',
  sortColumn,
  sortDirection,
  onHeaderClick,
}: {
  column: SortColumn
  label: string
  align?: 'left' | 'right'
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  onHeaderClick: (column: SortColumn) => void
}) {
  const isActive = sortColumn === column
  return (
    <TableCell
      align={align}
      onClick={() => onHeaderClick(column)}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        fontWeight: isActive ? 'bold' : 'normal',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        {isActive && (
          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
        )}
      </Box>
    </TableCell>
  )
}

export default function GearSuggestions({
  currentSetup,
  selectedProperties,
  items,
  setsData,
  craftingData,
  propertyIndex,
  pinnedSlots,
  excludeSetAugments,
  excludedAugments,
  excludedPacks,
  onApplySetup,
  ownedItemNames,
  onExcludeSetAugmentsChange,
}: GearSuggestionsProps) {
  const [optimizedPlans, setOptimizedPlans] = useState<GearPlan[]>([])
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [ownedOnly, setOwnedOnly] = useState(false)

  // Build the current plan from the already-evaluated setup
  const currentPlan: GearPlan = useMemo(() => ({
    label: 'Current',
    setup: currentSetup.setup,
    propertyValues: currentSetup.propertyValues,
    propertyBreakdowns: currentSetup.propertyBreakdowns,
    unusedAugments: currentSetup.unusedAugments,
    totalAugments: currentSetup.totalAugments,
    activeSets: currentSetup.activeSets,
    otherEffects: currentSetup.otherEffects,
    extraProperties: currentSetup.extraProperties,
  }), [currentSetup])

  // All plans: current + optimized
  const allPlans: GearPlan[] = useMemo(() => {
    return [currentPlan, ...optimizedPlans]
  }, [currentPlan, optimizedPlans])

  // Sort plans
  const sortedPlans = useMemo(() => {
    return [...allPlans].sort((a, b) => {
      if (sortColumn) {
        let comparison = 0
        if (sortColumn === 'augments') {
          const aUsed = (a.totalAugments || 0) - (a.unusedAugments || 0)
          const bUsed = (b.totalAugments || 0) - (b.unusedAugments || 0)
          comparison = bUsed - aUsed
        } else if (sortColumn === 'other') {
          comparison = (b.extraProperties || 0) - (a.extraProperties || 0)
        } else if (sortColumn === 'sets') {
          comparison = (b.activeSets || 0) - (a.activeSets || 0)
        } else {
          const aVal = a.propertyValues.get(sortColumn) || 0
          const bVal = b.propertyValues.get(sortColumn) || 0
          comparison = bVal - aVal
        }
        if (comparison !== 0) {
          return sortDirection === 'asc' ? -comparison : comparison
        }
      }
      // Default: sort by all properties in order
      for (const property of selectedProperties) {
        const aVal = a.propertyValues.get(property) || 0
        const bVal = b.propertyValues.get(property) || 0
        if (bVal !== aVal) return bVal - aVal
      }
      return 0
    })
  }, [allPlans, sortColumn, sortDirection, selectedProperties])

  const handleHeaderClick = useCallback((column: SortColumn) => {
    setSortColumn(prevColumn => {
      if (prevColumn === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        return prevColumn
      }
      setSortDirection('desc')
      return column
    })
  }, [])

  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage)
  }, [])

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }, [])

  const handleOptimize = useCallback(() => {
    const options: SuggestionsOptions = {
      pinnedSlots,
      excludeSetAugments,
      excludedAugments,
      excludedPacks,
    }

    // Pre-filter items to those with at least one tracked property
    const propertySet = new Set(selectedProperties)
    let relevantItems = items.filter(item =>
      item.affixes.some(a => propertySet.has(a.name))
    )

    // If owned-only mode, further filter to items in Trove inventory
    if (ownedOnly && ownedItemNames.size > 0) {
      relevantItems = relevantItems.filter(item => ownedItemNames.has(item.name))
    }

    const plans: GearPlan[] = []
    const seenSetups = new Set<string>()

    const setupToKey = (setup: GearSetup): string => {
      return Object.entries(setup)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v?.name ?? ''}`)
        .join('|')
    }

    // Add current setup key to avoid duplicates
    seenSetups.add(setupToKey(currentSetup.setup))

    const addPlan = (label: string, setup: GearSetup) => {
      const key = setupToKey(setup)
      if (seenSetups.has(key)) return
      seenSetups.add(key)

      const result = evaluateGearSetup(
        setup, selectedProperties, setsData, craftingData,
        excludeSetAugments, excludedAugments, excludedPacks,
      )
      plans.push({
        label,
        setup,
        propertyValues: result.propertyValues,
        propertyBreakdowns: result.propertyBreakdowns,
        unusedAugments: result.unusedAugments,
        totalAugments: result.totalAugments,
        activeSets: result.activeSets,
        otherEffects: result.otherEffects,
        extraProperties: result.extraProperties,
      })
    }

    // Build a setup containing only pinned items (used as base for fresh start)
    const pinnedOnlySetup: GearSetup = {}
    for (const slot of Object.keys(currentSetup.setup) as (keyof GearSetup)[]) {
      if (pinnedSlots.has(slot) && currentSetup.setup[slot]) {
        pinnedOnlySetup[slot] = currentSetup.setup[slot]
      }
    }

    // Plan 1: Optimize from current setup (keeps existing items as coverage seeds)
    const opt1 = optimizeSetup(
      currentSetup.setup, relevantItems, selectedProperties,
      setsData, craftingData, propertyIndex, [], options,
    )
    addPlan('Optimized', opt1.setup)

    // Plan 2: Optimize from pinned-only setup (fresh start but respects pins)
    const opt2 = optimizeSetup(
      pinnedOnlySetup, relevantItems, selectedProperties,
      setsData, craftingData, propertyIndex, [], options,
    )
    addPlan('Fresh Start', opt2.setup)

    // Priority variants: optimize with each property as top priority
    for (let i = 1; i < selectedProperties.length; i++) {
      const reordered = [
        selectedProperties[i],
        ...selectedProperties.filter((_, idx) => idx !== i),
      ]
      const optN = optimizeSetup(
        currentSetup.setup, relevantItems, reordered,
        setsData, craftingData, propertyIndex, [], options,
      )
      addPlan(`Priority: ${selectedProperties[i]}`, optN.setup)
    }

    // Fresh start priority variants
    for (let i = 1; i < selectedProperties.length; i++) {
      const reordered = [
        selectedProperties[i],
        ...selectedProperties.filter((_, idx) => idx !== i),
      ]
      const optN = optimizeSetup(
        pinnedOnlySetup, relevantItems, reordered,
        setsData, craftingData, propertyIndex, [], options,
      )
      addPlan(`Fresh: ${selectedProperties[i]}`, optN.setup)
    }

    // Slot-swap variants: for each slot in the optimized setup, try alternative items
    const baseSwapSetup = Object.keys(opt1.setup).length > 0 ? opt1.setup : currentSetup.setup
    const swapVariants = generateSlotSwapVariants(
      baseSwapSetup, relevantItems, selectedProperties,
      setsData, craftingData, options, 2,
    )
    for (const variant of swapVariants) {
      addPlan('Swap Variant', variant)
    }

    // Set-focused variants: try to maximize relevant gear sets
    const setVariants = generateSetFocusedVariants(
      baseSwapSetup, relevantItems, selectedProperties,
      setsData, options,
    )
    for (const variant of setVariants) {
      addPlan('Set Focus', variant)
    }

    setOptimizedPlans(plans)
    setPage(0)
  }, [currentSetup, items, selectedProperties, setsData, craftingData, propertyIndex, pinnedSlots, excludeSetAugments, excludedAugments, excludedPacks, ownedOnly, ownedItemNames])

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexShrink: 0 }}>
          Gear Suggestions
        </Typography>

        {/* Filter toggles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <FilterListIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
          <Tooltip title="Exclude Set Augments from auto-selection in crafting slots" arrow>
            <ToggleButton
              value="excludeSetAugments"
              selected={excludeSetAugments}
              onChange={() => onExcludeSetAugmentsChange(!excludeSetAugments)}
              size="small"
              sx={{ textTransform: 'none', px: 1 }}
            >
              <LayersClearIcon sx={{ fontSize: 18, mr: 0.5 }} />
              No Set Augments
            </ToggleButton>
          </Tooltip>
          {ownedItemNames.size > 0 && (
            <Tooltip title="Only use gear items available in your Trove inventory. Augments and crafting options are not affected by this filter." arrow>
              <ToggleButton
                value="ownedOnly"
                selected={ownedOnly}
                onChange={() => setOwnedOnly(prev => !prev)}
                size="small"
                sx={{ textTransform: 'none', px: 1 }}
              >
                <InventoryIcon sx={{ fontSize: 18, mr: 0.5 }} />
                Owned Only
              </ToggleButton>
            </Tooltip>
          )}
        </Box>

        {/* Optimize button */}
        <Button
          variant="contained"
          startIcon={<AutoFixHighIcon />}
          onClick={handleOptimize}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          Optimize
        </Button>
      </Box>

      {allPlans.length > 1 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {allPlans.length} plans found (click column header to sort)
        </Typography>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper' }}>Action</TableCell>
              <TableCell sx={{ position: 'sticky', left: 68, zIndex: 3, backgroundColor: 'background.paper' }}>Setup</TableCell>
              {selectedProperties.map(property => (
                <SortableHeaderCell
                  key={property}
                  column={property}
                  label={property}
                  align="right"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onHeaderClick={handleHeaderClick}
                />
              ))}
              <SortableHeaderCell
                column="augments"
                label="Augments"
                align="right"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onHeaderClick={handleHeaderClick}
              />
              <SortableHeaderCell
                column="sets"
                label="Sets"
                align="right"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onHeaderClick={handleHeaderClick}
              />
              <SortableHeaderCell
                column="other"
                label="Other Effects"
                align="right"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onHeaderClick={handleHeaderClick}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlans
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((plan, idx) => {
                const isCurrent = plan.label === 'Current'
                const displayIndex = page * rowsPerPage + idx

                return (
                  <TableRow
                    key={displayIndex}
                    hover={!isCurrent}
                    sx={{
                      backgroundColor: isCurrent ? 'action.selected' : 'inherit',
                    }}
                  >
                    <TableCell align="center" sx={{ position: 'sticky', left: 0, zIndex: 1, backgroundColor: isCurrent ? 'action.selected' : 'background.paper' }}>
                      {isCurrent ? (
                        <Typography variant="caption" color="text.secondary">Active</Typography>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onApplySetup(plan.setup)}
                        >
                          Apply
                        </Button>
                      )}
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 68, zIndex: 1, backgroundColor: isCurrent ? 'action.selected' : 'background.paper' }}>
                      <strong>{plan.label}</strong>
                    </TableCell>
                    {selectedProperties.map(property => {
                      const value = plan.propertyValues.get(property) || 0
                      const currentValue = currentPlan.propertyValues.get(property) || 0
                      const diff = value - currentValue
                      const breakdown = plan.propertyBreakdowns?.get(property)

                      const tooltipContent = breakdown && breakdown.size > 0 ? (
                        <Box>
                          {Array.from(breakdown.entries())
                            .sort((a, b) => b[1] - a[1])
                            .map(([bonusType, bonusValue]) => (
                              <Typography key={bonusType} variant="caption" display="block">
                                +{bonusValue} {bonusType}
                              </Typography>
                            ))}
                        </Box>
                      ) : null

                      return (
                        <TableCell key={property} align="right">
                          {tooltipContent ? (
                            <Tooltip title={tooltipContent} placement="top" arrow>
                              <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>
                                +{value}
                                {!isCurrent && diff !== 0 && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{
                                      ml: 0.5,
                                      color: diff > 0 ? 'success.main' : 'error.main',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    ({diff > 0 ? '+' : ''}{diff})
                                  </Typography>
                                )}
                              </span>
                            </Tooltip>
                          ) : (
                            <span>
                              +{value}
                              {!isCurrent && diff !== 0 && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    ml: 0.5,
                                    color: diff > 0 ? 'success.main' : 'error.main',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  ({diff > 0 ? '+' : ''}{diff})
                                </Typography>
                              )}
                            </span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell align="right">
                      {plan.totalAugments !== undefined && plan.unusedAugments !== undefined
                        ? `${plan.totalAugments - plan.unusedAugments}/${plan.totalAugments}`
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {plan.activeSets !== undefined ? plan.activeSets : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {plan.otherEffects && plan.otherEffects.length > 0 ? (
                        <Tooltip
                          title={
                            <Box>
                              {plan.otherEffects.map((effect, i) => (
                                <Typography key={i} variant="caption" display="block">
                                  &bull; {effect}
                                </Typography>
                              ))}
                            </Box>
                          }
                          arrow
                        >
                          <span style={{ cursor: 'help' }}>
                            {plan.otherEffects.length}
                          </span>
                        </Tooltip>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </TableContainer>
      {allPlans.length > 10 && (
        <TablePagination
          component="div"
          count={sortedPlans.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}
    </Box>
  )
}
