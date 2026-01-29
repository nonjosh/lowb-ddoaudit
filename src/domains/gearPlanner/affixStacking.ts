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
 * Complex properties that expand to multiple underlying properties
 */
const COMPLEX_PROPERTIES: Record<string, string[]> = {
  'Well Rounded': ['Strength', 'Constitution', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'],
  'Sheltering': ['Physical Sheltering', 'Magical Sheltering']
}

/**
 * Check if a property is a complex property
 */
export function isComplexProperty(propertyName: string): boolean {
  return propertyName in COMPLEX_PROPERTIES
}

/**
 * Expand a complex property affix into its component properties
 */
function expandComplexAffix(affix: ItemAffix): ItemAffix[] {
  const expanded = COMPLEX_PROPERTIES[affix.name]
  if (!expanded) {
    return [affix]
  }

  // Create an affix for each component property with the same type and value
  return expanded.map(componentName => ({
    name: componentName,
    type: affix.type,
    value: affix.value
  }))
}

/**
 * Combines multiple affixes, applying stacking rules:
 * - Affixes of the same type do NOT stack (highest value wins)
 * - Affixes of different types DO stack
 * - Boolean affixes are ignored for numerical calculations
 * - Complex properties are expanded to their component properties
 */
export function combineAffixes(affixes: ItemAffix[]): Map<string, PropertyValue> {
  const propertyMap = new Map<string, PropertyValue>()

  // First, expand complex properties
  const expandedAffixes: ItemAffix[] = []
  for (const affix of affixes) {
    expandedAffixes.push(...expandComplexAffix(affix))
  }

  for (const affix of expandedAffixes) {
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
 * Gets all property names from combined affixes (excluding complex properties)
 */
export function getAllPropertyNames(combinedAffixes: Map<string, PropertyValue>): string[] {
  return Array.from(combinedAffixes.keys()).sort()
}
