import { PropertyBonusIndex, getTheoreticalMax } from './propertyIndex'

// --- Types ---

export interface GearConstraint {
  property: string
  operator: 'gte' | 'lte' | 'eq'
  value: number
  priority: 'hard' | 'soft'
}

export interface ScoreBreakdown {
  total: number
  propertyScores: Map<string, number>
  constraintPenalty: number
  violatedConstraints: GearConstraint[]
}

// --- Weight Computation ---

const WEIGHT_DECAY = 0.8
const HARD_CONSTRAINT_PENALTY = 10000
const SOFT_CONSTRAINT_WEIGHT = 5

/**
 * Compute geometric decay weights from drag-ordered property list.
 * Position 0 → weight 1.0, position 1 → 0.8, position 2 → 0.64, ...
 */
export function computePropertyWeights(orderedProperties: string[]): Map<string, number> {
  const weights = new Map<string, number>()
  for (let i = 0; i < orderedProperties.length; i++) {
    weights.set(orderedProperties[i], Math.pow(WEIGHT_DECAY, i))
  }
  return weights
}

/**
 * Precompute theoretical max for each property using the index.
 * Used for normalization so different-scale properties are comparable.
 */
export function precomputePropertyMaxValues(
  index: PropertyBonusIndex,
  properties: string[],
): Map<string, number> {
  const maxValues = new Map<string, number>()
  for (const prop of properties) {
    const max = getTheoreticalMax(index, prop)
    maxValues.set(prop, max > 0 ? max : 1) // Avoid division by zero
  }
  return maxValues
}

// --- Scoring ---

/**
 * Compute a scalar score for a gear evaluation result.
 *
 * Score = Σ(weight × normalized_value) - constraint_penalties
 *
 * Normalized values use the theoretical max from the index so that
 * Constitution (~37 max) and Spell DC (~10 max) contribute proportionally.
 */
export function computeScore(
  propertyValues: Map<string, number>,
  weights: Map<string, number>,
  maxValues: Map<string, number>,
  constraints: GearConstraint[] = [],
): ScoreBreakdown {
  let total = 0
  const propertyScores = new Map<string, number>()
  let constraintPenalty = 0
  const violatedConstraints: GearConstraint[] = []

  // Property contribution
  for (const [property, weight] of weights) {
    const value = propertyValues.get(property) ?? 0
    const maxVal = maxValues.get(property) ?? 1
    const normalized = value / maxVal
    const score = weight * normalized
    propertyScores.set(property, score)
    total += score
  }

  // Constraint penalties
  for (const constraint of constraints) {
    const value = propertyValues.get(constraint.property) ?? 0
    let violated = false

    switch (constraint.operator) {
      case 'gte':
        violated = value < constraint.value
        break
      case 'lte':
        violated = value > constraint.value
        break
      case 'eq':
        violated = value !== constraint.value
        break
    }

    if (violated) {
      violatedConstraints.push(constraint)
      if (constraint.priority === 'hard') {
        constraintPenalty += HARD_CONSTRAINT_PENALTY
      } else {
        const shortfall = Math.abs(constraint.value - value)
        constraintPenalty += shortfall * SOFT_CONSTRAINT_WEIGHT
      }
    }
  }

  total -= constraintPenalty

  return { total, propertyScores, constraintPenalty, violatedConstraints }
}

/**
 * Compare two score breakdowns and produce a delta summary.
 * Positive delta = candidate is better.
 */
export function computeScoreDelta(
  current: ScoreBreakdown,
  candidate: ScoreBreakdown,
): {
  totalDelta: number
  propertyDeltas: Map<string, number>
  constraintImprovement: number
} {
  const propertyDeltas = new Map<string, number>()

  for (const [property, candidateScore] of candidate.propertyScores) {
    const currentScore = current.propertyScores.get(property) ?? 0
    const delta = candidateScore - currentScore
    if (delta !== 0) propertyDeltas.set(property, delta)
  }

  return {
    totalDelta: candidate.total - current.total,
    propertyDeltas,
    constraintImprovement: current.constraintPenalty - candidate.constraintPenalty,
  }
}
