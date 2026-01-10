import { ItemAffix } from '@/api/ddoGearPlanner'

/**
 * Represents the total value of a property from multiple affixes
 */
export interface PropertyValue {
  name: string
  /** Map of bonus type to value (e.g., "Enhancement" -> 14, "Insight" -> 7) */
  bonuses: Map<string, number>
  /** Total value (sum of all bonuses) */
  total: number
}

/**
 * Combines multiple affixes, applying stacking rules:
 * - Affixes of the same type do NOT stack (highest value wins)
 * - Affixes of different types DO stack
 * - Boolean affixes are ignored for numerical calculations
 */
export function combineAffixes(affixes: ItemAffix[]): Map<string, PropertyValue> {
  const propertyMap = new Map<string, PropertyValue>()

  for (const affix of affixes) {
    // Skip boolean affixes for numerical calculations
    if (affix.type === 'bool') {
      continue
    }

    const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
    
    // Skip if value is not a valid number
    if (isNaN(value) || typeof value !== 'number') {
      continue
    }

    const propertyName = affix.name
    const bonusType = affix.type

    if (!propertyMap.has(propertyName)) {
      propertyMap.set(propertyName, {
        name: propertyName,
        bonuses: new Map(),
        total: 0
      })
    }

    const property = propertyMap.get(propertyName)!
    const currentValue = property.bonuses.get(bonusType) || 0

    // Only keep the highest value for the same bonus type
    if (value > currentValue) {
      property.bonuses.set(bonusType, value)
    }
  }

  // Calculate totals
  for (const property of propertyMap.values()) {
    property.total = Array.from(property.bonuses.values()).reduce((sum, val) => sum + val, 0)
  }

  return propertyMap
}

/**
 * Gets the total value for a specific property from combined affixes
 */
export function getPropertyTotal(combinedAffixes: Map<string, PropertyValue>, propertyName: string): number {
  return combinedAffixes.get(propertyName)?.total || 0
}

/**
 * Gets all property names from combined affixes
 */
export function getAllPropertyNames(combinedAffixes: Map<string, PropertyValue>): string[] {
  return Array.from(combinedAffixes.keys()).sort()
}
