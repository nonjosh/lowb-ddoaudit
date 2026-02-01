import { Item } from '@/api/ddoGearPlanner'

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
  return item.slot === 'Weapon' &&
    (item.type?.toLowerCase().includes('handwrap') ?? false)
}

/**
 * Check if item is a two-handed weapon
 */
export function isTwoHandedWeapon(item: Item): boolean {
  return item.slot === 'Weapon' &&
    (item.type?.toLowerCase().includes('two-handed') ?? false)
}

/**
 * Check if item is a single-handed weapon
 */
export function isSingleHandedWeapon(item: Item): boolean {
  return item.slot === 'Weapon' &&
    !isHandwrap(item) &&
    !isTwoHandedWeapon(item) &&
    !isRangedWeapon(item)
}

/**
 * Check if item is a ranged weapon (bow, crossbow, thrown)
 */
export function isRangedWeapon(item: Item): boolean {
  if (item.slot !== 'Weapon') return false
  const type = item.type?.toLowerCase() ?? ''
  const name = item.name.toLowerCase()
  return type.includes('bow') ||
    type.includes('crossbow') ||
    type.includes('throwing') ||
    type.includes('thrown') ||
    name.includes('bow') ||
    name.includes('crossbow')
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

  // Ranged weapons can have rune arm
  if (isRangedWeapon(mainHand)) {
    if (!offHand) return true
    // Only rune arms allowed with ranged weapons
    return isRuneArm(offHand)
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
