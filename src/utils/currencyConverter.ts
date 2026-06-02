export type ConverterUnit = 'points' | 'shards' | 'hkd'

export interface ConverterRates {
  minPointsPerHkd: number
  maxPointsPerHkd: number
  minShardsPerHkd: number
  maxShardsPerHkd: number
  minDpPerShard: number
  maxDpPerShard: number
}

export interface ValueRange {
  min: number
  max: number
}

export interface ConverterValues {
  points: ValueRange
  shards: ValueRange
  hkd: ValueRange
}

export type DdoPointBonusMode = 'normal' | 'double' | 'triple'

export interface DdoPointBundle {
  label: string
  basePoints: number
  bonusPoints: number
  points: number
  usd: number
  hkd: number
}

export interface AstralShardStorePack {
  label: string
  shards: number
  costDp: number
}

interface DdoPointBundleTemplate {
  basePoints: number
  baseBonusPoints: number
  usd: number
  hkd: number
}

const DDO_POINT_BUNDLE_TEMPLATES: DdoPointBundleTemplate[] = [
  { basePoints: 500, baseBonusPoints: 100, usd: 7.99, hkd: 62.3 },
  { basePoints: 1250, baseBonusPoints: 300, usd: 19.99, hkd: 155.9 },
  { basePoints: 3250, baseBonusPoints: 850, usd: 49.99, hkd: 389.9 },
  { basePoints: 5000, baseBonusPoints: 1300, usd: 74.99, hkd: 584.9 },
  { basePoints: 8750, baseBonusPoints: 2750, usd: 124.99, hkd: 974.9 },
  { basePoints: 16500, baseBonusPoints: 6500, usd: 199.99, hkd: 1559.9 },
]

const BONUS_POINT_MULTIPLIER: Record<DdoPointBonusMode, number> = {
  normal: 1,
  double: 2,
  triple: 3,
}

export function getDdoPointBundles(bonusMode: DdoPointBonusMode): DdoPointBundle[] {
  const bonusMultiplier = BONUS_POINT_MULTIPLIER[bonusMode]

  return DDO_POINT_BUNDLE_TEMPLATES.map((bundle) => {
    const bonusPoints = bundle.baseBonusPoints * bonusMultiplier
    const points = bundle.basePoints + bonusPoints

    return {
      label: `${formatAmount(points, 0)} Points`,
      basePoints: bundle.basePoints,
      bonusPoints,
      points,
      usd: bundle.usd,
      hkd: bundle.hkd,
    }
  })
}

export const DDO_POINT_BUNDLES: DdoPointBundle[] = getDdoPointBundles('normal')

export const ASTRAL_SHARD_STORE_PACKS: AstralShardStorePack[] = [
  { label: '2000 Astral Shards', shards: 2000, costDp: 9995 },
  { label: '1000 Astral Shards', shards: 1000, costDp: 5395 },
  { label: '500 Astral Shards', shards: 500, costDp: 2795 },
  { label: '265 Astral Shards', shards: 265, costDp: 1495 },
  { label: '200 Astral Shards', shards: 200, costDp: 1135 },
  { label: '140 Astral Shards', shards: 140, costDp: 795 },
  { label: '100 Astral Shards', shards: 100, costDp: 595 },
  { label: '65 Astral Shards', shards: 65, costDp: 395 },
  { label: '50 Astral Shards', shards: 50, costDp: 325 },
  { label: '30 Astral Shards', shards: 30, costDp: 195 },
  { label: '20 Astral Shards', shards: 20, costDp: 150 },
  { label: '10 Astral Shards', shards: 10, costDp: 75 },
]

function getPointsPerHkd(bundle: DdoPointBundle): number {
  return bundle.points / bundle.hkd
}

function getBundlePointsRange(bundles: DdoPointBundle[]): ValueRange {
  if (bundles.length === 0) {
    return { min: 1, max: 1 }
  }

  const rates = bundles.map(getPointsPerHkd)
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
  }
}

function getDpPerShardRange(packs: AstralShardStorePack[]): ValueRange {
  if (packs.length === 0) {
    return { min: 1, max: 1 }
  }

  const rates = packs.map((pack) => pack.costDp / pack.shards)
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
  }
}

const DEFAULT_DP_PER_SHARD_RANGE = getDpPerShardRange(ASTRAL_SHARD_STORE_PACKS)

export function getConverterRatesForBundles(bundles: DdoPointBundle[]): ConverterRates {
  const pointsPerHkdRange = getBundlePointsRange(bundles)

  return {
    minPointsPerHkd: pointsPerHkdRange.min,
    maxPointsPerHkd: pointsPerHkdRange.max,
    minShardsPerHkd: pointsPerHkdRange.min / DEFAULT_DP_PER_SHARD_RANGE.max,
    maxShardsPerHkd: pointsPerHkdRange.max / DEFAULT_DP_PER_SHARD_RANGE.min,
    minDpPerShard: DEFAULT_DP_PER_SHARD_RANGE.min,
    maxDpPerShard: DEFAULT_DP_PER_SHARD_RANGE.max,
  }
}

export const DEFAULT_CONVERTER_RATES: ConverterRates = getConverterRatesForBundles(DDO_POINT_BUNDLES)

const MIN_RATE = 0.000001

function safeRate(value: number): number {
  if (!Number.isFinite(value) || value < MIN_RATE) {
    return MIN_RATE
  }

  return value
}

function makeRange(a: number, b: number): ValueRange {
  return {
    min: Math.min(a, b),
    max: Math.max(a, b),
  }
}

export function toFixedRange(value: number): ValueRange {
  return { min: value, max: value }
}

export function convertFromSource(
  sourceUnit: ConverterUnit,
  sourceAmount: number,
  rates: ConverterRates,
): ConverterValues {
  const amount = Number.isFinite(sourceAmount) && sourceAmount > 0 ? sourceAmount : 0
  const pointsPerHkdRange = makeRange(
    safeRate(rates.minPointsPerHkd),
    safeRate(rates.maxPointsPerHkd),
  )
  const dpPerShardRange = makeRange(
    safeRate(rates.minDpPerShard),
    safeRate(rates.maxDpPerShard),
  )
  const shardsPerHkdRange = makeRange(
    safeRate(rates.minShardsPerHkd),
    safeRate(rates.maxShardsPerHkd),
  )

  if (sourceUnit === 'points') {
    const hkd = makeRange(
      amount / pointsPerHkdRange.max,
      amount / pointsPerHkdRange.min,
    )
    return {
      points: toFixedRange(amount),
      hkd,
      shards: makeRange(amount / dpPerShardRange.max, amount / dpPerShardRange.min),
    }
  }

  if (sourceUnit === 'shards') {
    const hkd = makeRange(
      amount / shardsPerHkdRange.max,
      amount / shardsPerHkdRange.min,
    )
    return {
      points: makeRange(amount * dpPerShardRange.min, amount * dpPerShardRange.max),
      shards: toFixedRange(amount),
      hkd,
    }
  }

  return {
    points: makeRange(
      amount * pointsPerHkdRange.min,
      amount * pointsPerHkdRange.max,
    ),
    shards: makeRange(
      amount * shardsPerHkdRange.min,
      amount * shardsPerHkdRange.max,
    ),
    hkd: toFixedRange(amount),
  }
}

export function formatAmount(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

export function formatRange(range: ValueRange, maximumFractionDigits = 2): string {
  const min = formatAmount(range.min, maximumFractionDigits)
  const max = formatAmount(range.max, maximumFractionDigits)

  if (Math.abs(range.max - range.min) < 1e-9) {
    return min
  }

  return `${min} ~ ${max}`
}

export function getBundlePointsPerHkdRange(bundle: DdoPointBundle): ValueRange {
  const value = getPointsPerHkd(bundle)
  return { min: value, max: value }
}

export function getHkdPerPointRange(pointsPerHkdRange: ValueRange): ValueRange {
  return {
    min: 1 / pointsPerHkdRange.max,
    max: 1 / pointsPerHkdRange.min,
  }
}

export function parseNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}
