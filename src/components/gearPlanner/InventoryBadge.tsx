import InventoryIcon from '@mui/icons-material/Inventory2'
import LockIcon from '@mui/icons-material/Lock'
import { Box, Chip, Tooltip, Typography } from '@mui/material'

import IconWrapper from '@/components/shared/IconWrapper'
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
 *
 * States:
 * - Green inventory icon: item is available to the selected character (or no character filter)
 * - Orange lock icon: item is BTC on the selected character
 * - Dull/transparent inventory icon: item exists in inventory but is BTC on another character (not available)
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

  // Check if item is in inventory but BTC-locked on another character (unavailable)
  const isBTCUnavailable = showBTC && selectedCharacterId !== null && !isAvailable &&
    locations.length > 0 && locations.some(
      loc => loc.binding === 'BoundToCharacter' && loc.characterId !== selectedCharacterId && loc.characterId !== 0
    )

  if (!isAvailable && !isBTC && !isBTCUnavailable) {
    return null
  }

  // Find which characters own the BTC-locked item
  const btcOwnerNames = isBTCUnavailable
    ? [...new Set(
      locations
        .filter(loc => loc.binding === 'BoundToCharacter' && loc.characterId !== selectedCharacterId && loc.characterId !== 0)
        .map(loc => {
          const char = characters.find(c => c.id === loc.characterId)
          return char?.name || 'Unknown'
        })
    )]
    : []

  // Format location strings
  const formatLocation = (loc: { characterId: number; container: string; tabName?: string; slottedInItem?: string }) => {
    let result: string
    if (loc.characterId === 0) {
      const tabSuffix = loc.tabName ? ` (${loc.tabName})` : ''
      result = `Shared Bank${tabSuffix}`
    } else {
      const char = characters.find((c) => c.id === loc.characterId)
      const charName = char?.name || 'Unknown'
      // Don't show tab name for equipped items (there's only one equipped slot)
      const tabSuffix = loc.container !== 'Equipped' && loc.tabName ? ` (${loc.tabName})` : ''
      result = `${charName} - ${loc.container}${tabSuffix}`
    }
    if (loc.slottedInItem) {
      result += ` → slotted in ${loc.slottedInItem}`
    }
    return result
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
      {isBTCUnavailable && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
            BTC — Not available
          </Typography>
          <Typography variant="caption" component="div">
            Bound to: {btcOwnerNames.join(', ')}
          </Typography>
        </>
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
        {isBTCUnavailable && (
          <Tooltip title={tooltipContent} arrow>
            <Chip
              icon={<InventoryIcon />}
              label={`Owned (${btcOwnerNames.join(', ')})`}
              size={size}
              variant="outlined"
              sx={{ opacity: 0.4 }}
            />
          </Tooltip>
        )}
      </Box>
    )
  }

  // Default: icon variant
  const iconFrameSize = size === 'small' ? 28 : 32

  return (
    <Box sx={{ display: 'inline-flex', gap: 0.25, alignItems: 'center', lineHeight: 0 }}>
      {isAvailable && (
        <Tooltip title={tooltipContent} arrow>
          <Box component="span">
            <IconWrapper size={iconFrameSize} color="success.main">
              <InventoryIcon sx={{ verticalAlign: 'middle' }} />
            </IconWrapper>
          </Box>
        </Tooltip>
      )}
      {isBTC && (
        <Tooltip title="Bound to Character" arrow>
          <Box component="span">
            <IconWrapper size={iconFrameSize} color="warning.main">
              <LockIcon sx={{ verticalAlign: 'middle' }} />
            </IconWrapper>
          </Box>
        </Tooltip>
      )}
      {isBTCUnavailable && (
        <Tooltip title={tooltipContent} arrow>
          <Box component="span" sx={{ opacity: 0.35 }}>
            <IconWrapper size={iconFrameSize} color="success.main">
              <InventoryIcon sx={{ verticalAlign: 'middle' }} />
            </IconWrapper>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}
