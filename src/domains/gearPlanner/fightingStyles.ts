import { Item } from '@/api/ddoGearPlanner'

const TWO_HANDED_TYPES = new Set([
  'great swords', 'great axes', 'great clubs', 'mauls', 'falchions', 'quarterstaffs',
])

const THROWN_TYPES = new Set([
  'darts', 'shurikens', 'throwing axes', 'throwing daggers', 'throwing hammers',
])

export type FightingStyle =
  | 'unarmed'      // Handwrap
  | 'swf'          // Single weapon + empty/orb/runestone
  | 'twf'          // Two weapons
  | 'thf'          // Two-handed weapon
  | 'snb'          // Weapon + shield
  | 'ranged'       // Ranged weapon (bow/crossbow/thrown) + optional rune arm
  | 'none'         // Nothing equipped

/**
 * Detect the fighting style based on equipped weapons
 */
export function detectFightingStyle(
  mainHand: Item | undefined,
  offHand: Item | undefined
): FightingStyle {
  if (!mainHand) return 'none'

  // Check for handwraps (unarmed)
  if (mainHand.slot === 'Weapon' && isHandwrap(mainHand)) {
    return 'unarmed'
  }

  // Check for two-handed weapon
  if (mainHand.slot === 'Weapon' && isTwoHandedWeapon(mainHand)) {
    return 'thf'
  }

  // Check for ranged weapon
  if (mainHand.slot === 'Weapon' && isRangedWeapon(mainHand)) {
    return 'ranged'
  }

  // No off-hand = single weapon fighting
  if (!offHand) return 'swf'

  // Check off-hand type
  if (offHand.slot === 'Offhand') {
    if (isShield(offHand)) return 'snb'
    if (isOrb(offHand) || isRuneArm(offHand)) return 'swf'
  }

  // Off-hand weapon = two weapon fighting
  if (offHand.slot === 'Weapon') return 'twf'

  return 'swf'
}

/**
 * Check if item is a handwrap
 */
export function isHandwrap(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  return type.includes('handwrap')
}

/**
 * Check if item is a two-handed weapon
 */
export function isTwoHandedWeapon(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  return TWO_HANDED_TYPES.has(type)
}

/**
 * Check if item is a single-handed weapon
 */
export function isSingleHandedWeapon(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  return !isHandwrap(item) && !isTwoHandedWeapon(item) && !isRangedWeapon(item)
}

/**
 * Check if item is a ranged weapon (bow, crossbow, thrown)
 */
export function isRangedWeapon(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  return isBow(item) || isCrossbow(item) || isThrownWeapon(item)
}

/**
 * Check if item is a bow (not crossbow) — bows block off-hand entirely
 */
export function isBow(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  return type.includes('bow') && !type.includes('crossbow')
}

/**
 * Check if item is a crossbow — can use Rune Arm in off-hand
 */
export function isCrossbow(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  return type.includes('crossbow')
}

/**
 * Check if item is a thrown weapon — can use Rune Arm in off-hand
 */
export function isThrownWeapon(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  return type.includes('throwing') || THROWN_TYPES.has(type)
}

/**
 * Check if a main hand weapon blocks the off-hand slot entirely.
 * Two-handed weapons, handwraps, and bows cannot have any off-hand.
 */
export function isOffHandBlocked(mainHand: Item | undefined): boolean {
  if (!mainHand) return false
  return isHandwrap(mainHand) || isTwoHandedWeapon(mainHand) || isBow(mainHand)
}

/**
 * Check if off-hand is restricted to Rune Arms only (crossbows).
 */
export function isOffHandRuneArmOnly(mainHand: Item | undefined): boolean {
  if (!mainHand) return false
  return isCrossbow(mainHand)
}

/**
 * Get the off-hand warning message based on the current weapon combination.
 * Returns null if the combination is valid or no warning is needed.
 */
export function getOffHandWarning(
  mainHand: Item | undefined,
  offHand: Item | undefined
): string | null {
  if (!mainHand) return null

  // Two-handed weapons, handwraps, bows block off-hand entirely
  if (isOffHandBlocked(mainHand)) {
    if (offHand) {
      return `${mainHand.type ?? 'This weapon'} cannot be used with off-hand items. Off-hand stats are ignored.`
    }
    return `${mainHand.type ?? 'This weapon'} cannot equip off-hand items.`
  }

  // Crossbows only allow Rune Arms
  if (isCrossbow(mainHand)) {
    if (offHand && !isRuneArm(offHand)) {
      return `${mainHand.type ?? 'Crossbows'} can only use Rune Arms in the off-hand. Current off-hand stats are ignored.`
    }
    if (!offHand) {
      return 'Crossbows can only equip Rune Arms in the off-hand.'
    }
  }

  // Thrown weapons: cannot dual wield, allow one-handed melee, shields, orbs, rune arms
  if (isThrownWeapon(mainHand)) {
    if (offHand && offHand.slot === 'Weapon' && isThrownWeapon(offHand)) {
      return 'Cannot dual wield throwing weapons. Off-hand stats are ignored.'
    }
    if (offHand && offHand.slot === 'Weapon' && !isSingleHandedWeapon(offHand)) {
      return 'Throwing weapons can only use one-handed melee weapons, shields, orbs, or Rune Arms in the off-hand.'
    }
    if (!offHand) {
      return 'Thrown weapons can equip one-handed melee weapons, shields, orbs, or Rune Arms in the off-hand.'
    }
  }

  return null
}

/**
 * Check if item is a shield
 */
export function isShield(item: Item): boolean {
  return item.slot === 'Offhand' && item.type === 'Shields'
}

/**
 * Check if item is an orb
 */
export function isOrb(item: Item): boolean {
  return item.slot === 'Offhand' && item.type === 'Orbs'
}

/**
 * Check if item is a rune arm
 */
export function isRuneArm(item: Item): boolean {
  return item.slot === 'Offhand' && item.type === 'Rune Arms'
}

/**
 * Validate if a weapon combination is legal
 */
export function isValidWeaponCombination(
  mainHand: Item | undefined,
  offHand: Item | undefined
): boolean {
  if (!mainHand) return !offHand // Both empty is valid

  // Handwrap cannot have off-hand
  if (isHandwrap(mainHand)) {
    return !offHand
  }

  // Two-handed cannot have off-hand
  if (isTwoHandedWeapon(mainHand)) {
    return !offHand
  }

  // Bows block off-hand entirely (already handled above)
  if (isBow(mainHand)) {
    return !offHand
  }

  // Crossbows can only have rune arm
  if (isCrossbow(mainHand)) {
    if (!offHand) return true
    return isRuneArm(offHand)
  }

  // Thrown weapons can have one-handed weapons or offhand items
  if (isThrownWeapon(mainHand)) {
    if (!offHand) return true
    return offHand.slot === 'Offhand' ||
      (offHand.slot === 'Weapon' && isSingleHandedWeapon(offHand))
  }

  // Single-handed can have any valid off-hand
  if (isSingleHandedWeapon(mainHand)) {
    if (!offHand) return true

    // Valid off-hand types for single-handed weapons
    return offHand.slot === 'Offhand' ||
      (offHand.slot === 'Weapon' && isSingleHandedWeapon(offHand))
  }

  return false
}

/**
 * Get valid weapons for a specific fighting style and slot
 */
export function getValidWeaponsForStyle(
  items: Item[],
  style: FightingStyle,
  slot: 'mainHand' | 'offHand'
): Item[] {
  if (slot === 'mainHand') {
    switch (style) {
      case 'unarmed':
        return items.filter(i => isHandwrap(i))
      case 'thf':
        return items.filter(i => isTwoHandedWeapon(i))
      case 'ranged':
        return items.filter(i => isRangedWeapon(i))
      case 'swf':
      case 'twf':
      case 'snb':
        return items.filter(i => isSingleHandedWeapon(i))
      default:
        return []
    }
  } else {
    // offHand slot
    switch (style) {
      case 'unarmed':
      case 'thf':
        return [] // No off-hand allowed
      case 'ranged':
        return items.filter(i => isRuneArm(i))
      case 'swf':
        return items.filter(i => isOrb(i) || isRuneArm(i))
      case 'twf':
        return items.filter(i => isSingleHandedWeapon(i))
      case 'snb':
        return items.filter(i => isShield(i))
      default:
        return []
    }
  }
}

/**
 * Get human-readable fighting style name
 */
export function getFightingStyleName(style: FightingStyle): string {
  switch (style) {
    case 'unarmed': return 'Unarmed (Handwraps)'
    case 'swf': return 'Single Weapon Fighting'
    case 'twf': return 'Two Weapon Fighting'
    case 'thf': return 'Two-Handed Fighting'
    case 'snb': return 'Sword & Board'
    case 'ranged': return 'Ranged (Bow/Crossbow/Thrown)'
    case 'none': return 'No Weapons'
  }
}
