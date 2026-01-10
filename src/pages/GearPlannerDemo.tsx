import { useMemo, useState } from 'react'

import {
  Box,
  Container,
  Divider,
  Grid,
  Paper,
  Typography
} from '@mui/material'

import GearDisplay from '@/components/gearPlanner/GearDisplay'
import GearSuggestions from '@/components/gearPlanner/GearSuggestions'
import PropertySelector from '@/components/gearPlanner/PropertySelector'
import SummaryTable from '@/components/gearPlanner/SummaryTable'
import { getAllAvailableProperties, optimizeGear } from '@/domains/gearPlanner'
import { mockItems, mockSetsData } from '@/domains/gearPlanner/mockData'

export default function GearPlannerDemo() {
  const [selectedProperties, setSelectedProperties] = useState<string[]>(['Strength', 'Constitution', 'Doublestrike'])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)

  // Get available properties from mock items
  const availableProperties = useMemo(() => {
    return getAllAvailableProperties(mockItems)
  }, [])

  // Optimize gear when properties change
  const optimizedSetups = useMemo(() => {
    if (selectedProperties.length < 3) return []
    
    return optimizeGear(mockItems, mockSetsData, {
      properties: selectedProperties,
      maxResults: 20
    })
  }, [selectedProperties])

  const selectedSetup = optimizedSetups[selectedSuggestionIndex]

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Gear Planner Demo (Mock Data)
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select properties to optimize and find the best gear combinations
      </Typography>

      {/* Section 1: Property Selector */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <PropertySelector
          availableProperties={availableProperties}
          selectedProperties={selectedProperties}
          onChange={setSelectedProperties}
        />
      </Paper>

      {/* Show message if less than 3 properties selected */}
      {selectedProperties.length > 0 && selectedProperties.length < 3 && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="body1" color="text.secondary">
            Please select at least 3 properties to generate gear suggestions
          </Typography>
        </Paper>
      )}

      {/* Show results if 3+ properties selected */}
      {selectedProperties.length >= 3 && optimizedSetups.length > 0 && selectedSetup && (
        <>
          <Grid container spacing={3}>
            {/* Section 2: Selected Gear Display */}
            <Grid xs={12} lg={8}>
              <Paper elevation={2}>
                <GearDisplay
                  setup={selectedSetup.setup}
                  propertyValues={selectedSetup.propertyValues}
                  selectedProperties={selectedProperties}
                />
              </Paper>
            </Grid>

            {/* Section 3: Gear Suggestions */}
            <Grid xs={12} lg={4}>
              <Paper elevation={2}>
                <GearSuggestions
                  suggestions={optimizedSetups}
                  selectedIndex={selectedSuggestionIndex}
                  onSelect={setSelectedSuggestionIndex}
                  selectedProperties={selectedProperties}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Section 4: Summary Table */}
          <Paper elevation={2} sx={{ mt: 3 }}>
            <SummaryTable
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              setsData={mockSetsData}
            />
          </Paper>
        </>
      )}

      {/* Show message if no results found */}
      {selectedProperties.length >= 3 && optimizedSetups.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="body1" color="text.secondary">
            No gear combinations found for the selected properties
          </Typography>
        </Paper>
      )}
    </Container>
  )
}
