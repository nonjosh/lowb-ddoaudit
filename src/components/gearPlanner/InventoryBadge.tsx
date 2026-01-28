import InventoryIcon from '@mui/icons-material/Inventory2'
import LockIcon from '@mui/icons-material/Lock'
import { Box, Chip, Tooltip, Typography } from '@mui/material'

import { useTrove } from '@/contexts/useTrove'

// ============================================================================
// Types
// ============================================================================

interface InventoryBadgeProps {
  /** Item name to check availability */
  itemName: string
  /** Display variant */
  variant?: 'icon' | 'chip'
  /** Size of the badge */
  size?: 'small' | 'medium'
  /** Show BTC indicator */
  showBTC?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays an indicator when the user owns an item in their Trove inventory.
 * Shows location information in a tooltip.
 */
export default function InventoryBadge({
  itemName,
  variant = 'icon',
  size = 'small',
  showBTC = false
}: InventoryBadgeProps) {
  const {
    getItemLocations,
    isItemAvailableForCharacters,
    inventoryMap,
    characters,
    selectedCharacterId
  } = useTrove()

  // Don't render if no Trove data imported
  if (inventoryMap.size === 0) {
    return null
  }

  // Check if item is available (considering character filter)
  const isAvailable = isItemAvailableForCharacters(itemName)

  // Get all locations for tooltip
  const locations = getItemLocations(itemName)

  // Check if item has BTC binding for selected character
  const isBTC = showBTC && selectedCharacterId !== null && locations.some(
    loc => loc.characterId === selectedCharacterId && loc.binding === 'BoundToCharacter'
  )

  if (!isAvailable && !isBTC) {
    return null
  }

  // Format location strings
  const formatLocation = (loc: { characterId: number; container: string; tabName?: string }) => {
    if (loc.characterId === 0) {
      const tabSuffix = loc.tabName ? ` (${loc.tabName})` : ''
      return `Shared Bank${tabSuffix}`
    }
    const char = characters.find((c) => c.id === loc.characterId)
    const charName = char?.name || 'Unknown'
    // Don't show tab name for equipped items (there's only one equipped slot)
    const tabSuffix = loc.container !== 'Equipped' && loc.tabName ? ` (${loc.tabName})` : ''
    return `${charName} - ${loc.container}${tabSuffix}`
  }

  const tooltipContent = (
    <>
      {isAvailable && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            You own this item
          </Typography>
          {locations.length > 0 && (
            <>
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                Locations:
              </Typography>
              {locations.slice(0, 5).map((loc, i) => (
                <Typography key={i} variant="caption" component="div">
                  • {formatLocation(loc)}
                </Typography>
              ))}
              {locations.length > 5 && (
                <Typography
                  variant="caption"
                  component="div"
                  color="text.secondary"
                >
                  +{locations.length - 5} more
                </Typography>
              )}
            </>
          )}
        </>
      )}
      {isBTC && (
        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: isAvailable ? 1 : 0 }}>
          Bound to Character
        </Typography>
      )}
    </>
  )

  if (variant === 'chip') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {isAvailable && (
          <Tooltip title={tooltipContent} arrow>
            <Chip
              icon={<InventoryIcon />}
              label="Owned"
              size={size}
              color="success"
              variant="outlined"
            />
          </Tooltip>
        )}
        {isBTC && (
          <Tooltip title="Bound to Character" arrow>
            <Chip
              icon={<LockIcon />}
              label="BTC"
              size={size}
              color="warning"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
    )
  }

  // Default: icon variant
  return (
    <Box sx={{ display: 'inline-flex', gap: 0.25, alignItems: 'center' }}>
      {isAvailable && (
        <Tooltip title={tooltipContent} arrow>
          <InventoryIcon
            color="success"
            sx={{
              fontSize: size === 'small' ? 16 : 20,
              verticalAlign: 'middle'
            }}
          />
        </Tooltip>
      )}
      {isBTC && (
        <Tooltip title="Bound to Character" arrow>
          <LockIcon
            color="warning"
            sx={{
              fontSize: size === 'small' ? 14 : 18,
              verticalAlign: 'middle'
            }}
          />
        </Tooltip>
      )}
    </Box>
  )
}
