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
export const COMPLEX_PROPERTIES: Record<string, string[]> = {
  'Well Rounded': ['Strength', 'Constitution', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'],
  'Sheltering': ['Physical Sheltering', 'Magical Sheltering'],
  'Parrying': ['Fortitude Save', 'Reflex Save', 'Will Save', 'Armor Class'],
  'Spell DC': [
    'Abjuration DC',
    'Conjuration DC',
    'Divination DC',
    'Enchantment DC',
    'Evocation DC',
    'Illusion DC',
    'Necromancy DC',
    'Transmutation DC'
  ],
  'Tactic DC': ['Stunning DC', 'Sunder DC', 'Trip DC'],
  'Spell Focus Mastery': [
    'Abjuration Focus',
    'Conjuration Focus',
    'Divination Focus',
    'Enchantment Focus',
    'Evocation Focus',
    'Illusion Focus',
    'Necromancy Focus',
    'Transmutation Focus'
  ]
  // Note: 'Spell Focus' is normalized to 'Spell Focus Mastery' before expansion
  // Note: 'Luck' for all skills and saves would be too broad and is not included
}

/**
 * Check if a property is a complex property
 */
export function isComplexProperty(propertyName: string): boolean {
  return propertyName in COMPLEX_PROPERTIES
}

/**
 * Normalize property names (handle aliases)
 */
function normalizePropertyName(name: string): string {
  // Normalize "Spell Focus" to "Spell Focus Mastery"
  if (name === 'Spell Focus') {
    return 'Spell Focus Mastery'
  }
  return name
}

/**
 * Expand a complex property affix into its component properties
 */
function expandComplexAffix(affix: ItemAffix): ItemAffix[] {
  // Normalize the property name first
  const normalizedName = normalizePropertyName(affix.name)
  const expanded = COMPLEX_PROPERTIES[normalizedName]

  if (!expanded) {
    // Return with normalized name
    return [{ ...affix, name: normalizedName }]
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
 *
 * @param combinedAffixes - The combined affixes map
 * @param propertyName - The property to query
 * @param forDisplay - If true and property is complex, returns minimum instead of sum
 *
 * For complex properties:
 * - When forDisplay=false (default): Returns sum of all components (for optimization scoring)
 * - When forDisplay=true: Returns minimum of components (baseline universal bonus)
 */
export function getPropertyTotal(
  combinedAffixes: Map<string, PropertyValue>,
  propertyName: string,
  forDisplay = false
): number {
  // Normalize the property name first
  const normalizedName = normalizePropertyName(propertyName)

  // Check if this is a complex property
  const components = COMPLEX_PROPERTIES[normalizedName]
  if (components) {
    if (forDisplay) {
      // For display, return the minimum across all components
      // This represents the guaranteed universal bonus to all schools
      return Math.min(...components.map(componentName =>
        combinedAffixes.get(componentName)?.total || 0
      ))
    } else {
      // For scoring, return the sum (total optimization value)
      return components.reduce((sum, componentName) => {
        return sum + (combinedAffixes.get(componentName)?.total || 0)
      }, 0)
    }
  }

  // Regular property - just return its total
  return combinedAffixes.get(normalizedName)?.total || 0
}

/**
 * Gets the bonus breakdown for a specific property
 * Returns a map of bonus type to value (e.g., "Enhancement" -> 14)
 * For complex properties, returns the minimum bonuses across all components
 */
export function getPropertyBreakdown(
  combinedAffixes: Map<string, PropertyValue>,
  propertyName: string
): Map<string, number> {
  const normalizedName = normalizePropertyName(propertyName)

  // Check if this is a complex property
  const components = COMPLEX_PROPERTIES[normalizedName]
  if (components) {
    // For complex properties, find the minimum bonus for each bonus type
    const bonusMap = new Map<string, number>()
    const allBonusTypes = new Set<string>()

    // Collect all bonus types across all components
    for (const componentName of components) {
      const prop = combinedAffixes.get(componentName)
      if (prop) {
        for (const bonusType of prop.bonuses.keys()) {
          allBonusTypes.add(bonusType)
        }
      }
    }

    // For each bonus type, find the minimum value across all components
    for (const bonusType of allBonusTypes) {
      const values = components.map(componentName => {
        const prop = combinedAffixes.get(componentName)
        return prop?.bonuses.get(bonusType) || 0
      })
      const minValue = Math.min(...values)
      if (minValue > 0) {
        bonusMap.set(bonusType, minValue)
      }
    }

    return bonusMap
  }

  // Regular property - return its bonus map
  return combinedAffixes.get(normalizedName)?.bonuses || new Map()
}

/**
 * Gets all property names from combined affixes (excluding complex properties)
 */
export function getAllPropertyNames(combinedAffixes: Map<string, PropertyValue>): string[] {
  return Array.from(combinedAffixes.keys()).sort()
}
