import { Box, Card, CardContent, Grid, Typography } from '@mui/material'

import { Item } from '@/api/ddoGearPlanner'
import { GearSetup } from '@/domains/gearPlanner'

interface GearDisplayProps {
  setup: GearSetup
  propertyValues: Map<string, number>
  selectedProperties: string[]
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

function GearSlotCard({ slotName, item, selectedProperties }: { 
  slotName: string
  item: Item | undefined
  selectedProperties: string[]
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {slotName}
        </Typography>
        {item ? (
          <>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              ML {item.ml}
            </Typography>
            {selectedProperties.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {item.affixes
                  .filter(affix => 
                    selectedProperties.includes(affix.name) && 
                    affix.type !== 'bool'
                  )
                  .map((affix, idx) => (
                    <Typography key={idx} variant="caption" display="block">
                      {affix.name} +{affix.value} ({affix.type})
                    </Typography>
                  ))}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Not equipped
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function GearDisplay({
  setup,
  propertyValues,
  selectedProperties
}: GearDisplayProps) {
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Selected Gear Setup
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {slots.map(slot => (
          <Grid xs={12} sm={6} md={4} lg={3} key={slot}>
            <GearSlotCard
              slotName={slotDisplayNames[slot]}
              item={getItemForSlot(setup, slot)}
              selectedProperties={selectedProperties}
            />
          </Grid>
        ))}
      </Grid>

      {selectedProperties.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Total Property Values
            </Typography>
            <Grid container spacing={2}>
              {selectedProperties.map(property => (
                <Grid xs={6} sm={4} md={3} key={property}>
                  <Typography variant="body2" color="text.secondary">
                    {property}
                  </Typography>
                  <Typography variant="h6">
                    {propertyValues.get(property) || 0}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
