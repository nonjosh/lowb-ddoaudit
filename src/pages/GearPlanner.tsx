import { useEffect, useMemo, useState } from 'react'

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography
} from '@mui/material'

import GearDisplay from '@/components/gearPlanner/GearDisplay'
import GearSuggestions from '@/components/gearPlanner/GearSuggestions'
import PropertySelector from '@/components/gearPlanner/PropertySelector'
import SummaryTable from '@/components/gearPlanner/SummaryTable'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { getAllAvailableProperties, optimizeGear } from '@/domains/gearPlanner'

const SELECTED_PROPERTIES_KEY = 'gearPlanner_selectedProperties'
const SELECTED_INDEX_KEY = 'gearPlanner_selectedIndex'

function loadSelectedProperties(): string[] {
  try {
    const stored = localStorage.getItem(SELECTED_PROPERTIES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every(p => typeof p === 'string')) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveSelectedProperties(properties: string[]): void {
  try {
    localStorage.setItem(SELECTED_PROPERTIES_KEY, JSON.stringify(properties))
  } catch {
    // Ignore storage errors
  }
}

function loadSelectedIndex(): number {
  try {
    const stored = localStorage.getItem(SELECTED_INDEX_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 0
}

function saveSelectedIndex(index: number): void {
  try {
    localStorage.setItem(SELECTED_INDEX_KEY, String(index))
  } catch {
    // Ignore storage errors
  }
}

export default function GearPlanner() {
  const { items, setsData, craftingData, loading, error, refresh } = useGearPlanner()
  const [selectedProperties, setSelectedProperties] = useState<string[]>(loadSelectedProperties)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(loadSelectedIndex)
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  // Track previous properties to detect when optimization needs reset
  const [prevProperties, setPrevProperties] = useState<string[]>(selectedProperties)

  // Load data on mount if not already loaded
  useEffect(() => {
    if (items.length === 0 && !loading && !error) {
      void refresh(false)
    }
  }, [items.length, loading, error, refresh])

  // Get available properties from items
  const availableProperties = useMemo(() => {
    if (items.length === 0) return []
    return getAllAvailableProperties(items)
  }, [items])

  // Handle property selection change with persistence
  const handlePropertiesChange = (properties: string[]) => {
    setSelectedProperties(properties)
    saveSelectedProperties(properties)
    // Reset to first suggestion when properties change
    setSelectedSuggestionIndex(0)
    saveSelectedIndex(0)
  }

  // Handle suggestion selection change with persistence
  const handleSuggestionSelect = (index: number) => {
    setSelectedSuggestionIndex(index)
    saveSelectedIndex(index)
  }

  // Optimize gear when properties change
  const optimizedSetups = useMemo(() => {
    if (selectedProperties.length < 3 || items.length === 0) return []

    return optimizeGear(items, setsData, {
      properties: selectedProperties,
      maxResults: 20,
      craftingData
    })
  }, [items, setsData, craftingData, selectedProperties])

  // Reset selection when properties change, otherwise keep selection in bounds
  const effectiveIndex = useMemo(() => {
    // Check if properties changed (different length or content)
    const propertiesChanged = selectedProperties.length !== prevProperties.length ||
      selectedProperties.some((p, i) => p !== prevProperties[i])

    if (propertiesChanged) {
      // Update prev properties tracking via next render
      queueMicrotask(() => setPrevProperties(selectedProperties))
      return 0
    }
    // Keep current selection in bounds
    return Math.min(selectedSuggestionIndex, Math.max(0, optimizedSetups.length - 1))
  }, [optimizedSetups.length, prevProperties, selectedProperties, selectedSuggestionIndex])

  const selectedSetup = optimizedSetups[effectiveIndex]

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Failed to load gear data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {error || 'No items available'}
          </Typography>
          <Button variant="contained" onClick={() => refresh(true)}>
            Retry
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Gear Planner
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select properties to optimize and find the best gear combinations
      </Typography>

      {/* Section 1: Property Selector */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <PropertySelector
          availableProperties={availableProperties}
          selectedProperties={selectedProperties}
          onChange={handlePropertiesChange}
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
          {/* Section 3: Gear Suggestions (moved to top) */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <GearSuggestions
              suggestions={optimizedSetups}
              selectedIndex={effectiveIndex}
              onSelect={handleSuggestionSelect}
              selectedProperties={selectedProperties}
            />
          </Paper>

          {/* Section 2: Selected Gear Display */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <GearDisplay
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              hoveredProperty={hoveredProperty}
              craftingSelections={selectedSetup.craftingSelections}
              setsData={setsData}
            />
          </Paper>

          {/* Section 4: Summary Table */}
          <Paper elevation={2}>
            <SummaryTable
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              setsData={setsData}
              onPropertyHover={setHoveredProperty}
              craftingSelections={selectedSetup.craftingSelections}
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
