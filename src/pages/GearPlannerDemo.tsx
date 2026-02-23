import { useMemo, useState } from 'react'

import {
  Container,
  Paper,
  Typography
} from '@mui/material'

import GearDisplay from '@/components/gearPlanner/GearDisplay'
import GearSuggestions from '@/components/gearPlanner/GearSuggestions'
import PropertySelector from '@/components/gearPlanner/PropertySelector'
import SummaryTable from '@/components/gearPlanner/SummaryTable'
import { buildUpdatedCraftingSelections, calculateScore, getAllAvailableProperties, optimizeGear, OptimizedGearSetup } from '@/domains/gearPlanner'
import { mockCraftingData, mockItems, mockSetsData } from '@/domains/gearPlanner/mockData'
import { CraftingOption } from '@/api/ddoGearPlanner'

// Type for hovering on a specific bonus source (property + bonus type cell)
interface HoveredBonusSource {
  property: string
  bonusType: string
  augmentNames?: string[]
}

export default function GearPlannerDemo() {
  const [selectedProperties, setSelectedProperties] = useState<string[]>(['Strength', 'Constitution', 'Doublestrike'])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [manualSetup, setManualSetup] = useState<OptimizedGearSetup | null>(null)
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null)
  const [hoveredAugment, setHoveredAugment] = useState<string | null>(null)
  const [hoveredSetAugment, setHoveredSetAugment] = useState<string | null>(null)
  const [hoveredBonusSource, setHoveredBonusSource] = useState<HoveredBonusSource | null>(null)
  const [hoveredSetName, setHoveredSetName] = useState<string | null>(null)

  // Get available properties from mock items
  const availableProperties = useMemo(() => {
    return getAllAvailableProperties(mockItems)
  }, [])

  // Optimize gear when properties change
  const optimizedSetups = useMemo(() => {
    if (selectedProperties.length < 3) return []

    return optimizeGear(mockItems, mockSetsData, {
      properties: selectedProperties,
      maxResults: 20,
      craftingData: mockCraftingData
    })
  }, [selectedProperties])

  const effectiveIndex = Math.min(selectedSuggestionIndex, Math.max(0, optimizedSetups.length - 1))
  const selectedSetup = manualSetup || optimizedSetups[effectiveIndex]

  const handleSuggestionSelect = (index: number) => {
    setSelectedSuggestionIndex(index)
    setManualSetup(null)
  }

  const handleCraftingChange = (gearSlot: string, slotIndex: number, option: CraftingOption | null) => {
    const currentSetup = manualSetup || optimizedSetups[effectiveIndex]
    if (!currentSetup) return

    const item = currentSetup.setup[gearSlot as keyof typeof currentSetup.setup]
    const newCraftingSelections = buildUpdatedCraftingSelections(
      currentSetup.craftingSelections ?? {},
      gearSlot,
      slotIndex,
      option,
      item?.crafting
    )

    // Recalculate score so summary table and UI stay in sync
    const result = calculateScore(
      currentSetup.setup,
      selectedProperties,
      mockSetsData,
      mockCraftingData,
      false,
      [],
      [],
      newCraftingSelections
    )

    setManualSetup({
      setup: currentSetup.setup,
      score: result.score,
      propertyValues: result.propertyValues,
      unusedAugments: result.unusedAugments,
      totalAugments: result.totalAugments,
      extraProperties: result.extraProperties,
      otherEffects: result.otherEffects,
      activeSets: result.activeSets,
      craftingSelections: newCraftingSelections
    })
  }

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
              hoveredAugment={hoveredAugment}
              hoveredSetAugment={hoveredSetAugment}
              hoveredBonusSource={hoveredBonusSource}
              hoveredSetName={hoveredSetName}
              onAugmentHover={setHoveredAugment}
              onSetAugmentHover={setHoveredSetAugment}
              onSetNameHover={setHoveredSetName}
              craftingSelections={selectedSetup.craftingSelections}
              craftingData={mockCraftingData}
              setsData={mockSetsData}
              onCraftingChange={handleCraftingChange}
            />
          </Paper>

          {/* Section 4: Summary Table */}
          <Paper elevation={2}>
            <SummaryTable
              setup={selectedSetup.setup}
              selectedProperties={selectedProperties}
              setsData={mockSetsData}
              onPropertyHover={setHoveredProperty}
              onBonusSourceHover={setHoveredBonusSource}
              hoveredAugment={hoveredAugment}
              hoveredSetName={hoveredSetName}
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
