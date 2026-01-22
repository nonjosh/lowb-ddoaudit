import { useMemo, useState, useCallback } from 'react'

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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

import { OptimizedGearSetup } from '@/domains/gearPlanner'

interface GearSuggestionsProps {
  suggestions: OptimizedGearSetup[]
  selectedIndex: number
  onSelect: (index: number) => void
  selectedProperties: string[]
}

type SortColumn = 'augments' | 'other' | string
type SortDirection = 'asc' | 'desc'

interface SortableHeaderCellProps {
  column: SortColumn
  label: string
  align?: 'left' | 'right'
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  onHeaderClick: (column: SortColumn) => void
}

function SortableHeaderCell({ column, label, align = 'left', sortColumn, sortDirection, onHeaderClick }: SortableHeaderCellProps) {
  const isActive = sortColumn === column
  return (
    <TableCell
      align={align}
      onClick={() => onHeaderClick(column)}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        fontWeight: isActive ? 'bold' : 'normal',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
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
  suggestions,
  selectedIndex,
  onSelect,
  selectedProperties
}: GearSuggestionsProps) {
  // Sort column is which property to prioritize when clicking header
  // null means default sorting (by all properties in order)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      // If a specific column is selected, sort by that first
      if (sortColumn) {
        let comparison = 0

        if (sortColumn === 'augments') {
          const aUsed = (a.totalAugments || 0) - (a.unusedAugments || 0)
          const bUsed = (b.totalAugments || 0) - (b.unusedAugments || 0)
          comparison = bUsed - aUsed
        } else if (sortColumn === 'other') {
          comparison = (b.extraProperties || 0) - (a.extraProperties || 0)
        } else {
          const aVal = a.propertyValues.get(sortColumn) || 0
          const bVal = b.propertyValues.get(sortColumn) || 0
          comparison = bVal - aVal
        }

        if (comparison !== 0) {
          return sortDirection === 'asc' ? -comparison : comparison
        }
      }

      // Default: sort by all properties in order (1st property desc, then 2nd desc, etc.)
      for (const property of selectedProperties) {
        const aVal = a.propertyValues.get(property) || 0
        const bVal = b.propertyValues.get(property) || 0
        if (bVal !== aVal) {
          return bVal - aVal // descending
        }
      }
      return 0
    })
  }, [suggestions, sortColumn, sortDirection, selectedProperties])

  if (suggestions.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Gear Suggestions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No suggestions available
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Gear Suggestions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {suggestions.length} combinations found (click column header to sort)
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setup</TableCell>
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
            {sortedSuggestions.map((suggestion, idx) => {
              // Find original index for selection
              const originalIndex = suggestions.indexOf(suggestion)
              const isSelected = originalIndex === selectedIndex

              return (
                <TableRow
                  key={idx}
                  onClick={() => onSelect(originalIndex)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <TableCell>
                    <strong>#{idx + 1}</strong>
                  </TableCell>
                  {selectedProperties.map(property => {
                    const value = suggestion.propertyValues.get(property) || 0
                    return (
                      <TableCell key={property} align="right">
                        +{value}
                      </TableCell>
                    )
                  })}
                  <TableCell align="right">
                    {suggestion.totalAugments !== undefined && suggestion.unusedAugments !== undefined
                      ? `${suggestion.totalAugments - suggestion.unusedAugments}/${suggestion.totalAugments}`
                      : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {suggestion.otherEffects && suggestion.otherEffects.length > 0 ? (
                      <Tooltip
                        title={
                          <Box>
                            {suggestion.otherEffects.map((effect, i) => (
                              <Typography key={i} variant="caption" display="block">
                                • {effect}
                              </Typography>
                            ))}
                          </Box>
                        }
                        arrow
                      >
                        <span style={{ cursor: 'help' }}>
                          {suggestion.otherEffects.length}
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
    </Box>
  )
}
