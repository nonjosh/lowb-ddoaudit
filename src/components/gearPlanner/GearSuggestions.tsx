import React from 'react'

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Pagination,
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
  const itemsPerPage = 5
  const [page, setPage] = React.useState(1)
  
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSuggestions = suggestions.slice(startIndex, endIndex)
  const totalPages = Math.ceil(suggestions.length / itemsPerPage)

  const handlePageChange = (_: unknown, value: number) => {
    setPage(value)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Gear Suggestions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {suggestions.length} combinations found (sorted by total score)
      </Typography>

      {paginatedSuggestions.map((suggestion, idx) => {
        const actualIndex = startIndex + idx
        const isSelected = actualIndex === selectedIndex

        return (
          <Card
            key={actualIndex}
            variant="outlined"
            sx={{
              mb: 2,
              border: isSelected ? 2 : 1,
              borderColor: isSelected ? 'primary.main' : 'divider'
            }}
          >
            <CardActionArea onClick={() => onSelect(actualIndex)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Setup #{actualIndex + 1}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    Total: {suggestion.score}
                  </Typography>
                </Box>

                <Grid container spacing={1}>
                  {selectedProperties.map(property => {
                    const value = suggestion.propertyValues.get(property) || 0
                    return (
                      <Grid xs={6} sm={4} md={3} key={property}>
                        <Typography variant="caption" color="text.secondary">
                          {property}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          +{value}
                        </Typography>
                      </Grid>
                    )
                  })}
                </Grid>
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}
