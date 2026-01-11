import React, { useMemo, useState } from 'react'

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

export default function GearSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  selectedProperties
}: GearSuggestionsProps) {
  // Default sort by first selected property descending
  const [sortColumn, setSortColumn] = useState<SortColumn>(selectedProperties[0] || 'augments')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      let comparison = 0

      if (sortColumn === 'augments') {
        comparison = (b.unusedAugments || 0) - (a.unusedAugments || 0)
      } else if (sortColumn === 'other') {
        comparison = (b.extraProperties || 0) - (a.extraProperties || 0)
      } else {
        // Sort by property value
        const aVal = a.propertyValues.get(sortColumn) || 0
        const bVal = b.propertyValues.get(sortColumn) || 0
        comparison = bVal - aVal
      }

      return sortDirection === 'asc' ? -comparison : comparison
    })
  }, [suggestions, sortColumn, sortDirection])

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

  const SortableHeaderCell = ({ column, label, align = 'left' }: { column: SortColumn, label: string, align?: 'left' | 'right' }) => {
    const isActive = sortColumn === column
    return (
      <TableCell
        align={align}
        onClick={() => handleHeaderClick(column)}
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
                <SortableHeaderCell key={property} column={property} label={property} align="right" />
              ))}
              <SortableHeaderCell column="augments" label="Augments" align="right" />
              <SortableHeaderCell column="other" label="Other Effects" align="right" />
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
                    {suggestion.unusedAugments !== undefined && suggestion.totalAugments !== undefined
                      ? `${suggestion.unusedAugments}/${suggestion.totalAugments}`
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
