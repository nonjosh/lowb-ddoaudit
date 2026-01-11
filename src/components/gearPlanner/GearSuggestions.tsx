import React from 'react'

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

import { OptimizedGearSetup } from '@/domains/gearPlanner'

interface GearSuggestionsProps {
  suggestions: OptimizedGearSetup[]
  selectedIndex: number
  onSelect: (index: number) => void
  selectedProperties: string[]
}

export default function GearSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  selectedProperties
}: GearSuggestionsProps) {
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
        {suggestions.length} combinations found (sorted by unused augment slots, then extra properties)
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setup</TableCell>
              {selectedProperties.map(property => (
                <TableCell key={property} align="right">
                  {property}
                </TableCell>
              ))}
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Augments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suggestions.map((suggestion, idx) => {
              const isSelected = idx === selectedIndex
              
              return (
                <TableRow
                  key={idx}
                  onClick={() => onSelect(idx)}
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
                    <strong>{suggestion.score}</strong>
                  </TableCell>
                  <TableCell align="right">
                    {suggestion.unusedAugments !== undefined ? `${suggestion.unusedAugments} free` : '-'}
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
