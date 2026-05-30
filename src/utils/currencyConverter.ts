export type ConverterUnit = 'points' | 'shards' | 'hkd'

export interface ConverterRates {
  minPointsPerHkd: number
  maxPointsPerHkd: number
  minShardsPerHkd: number
  maxShardsPerHkd: number
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

export interface DdoPointBundle {
  label: string
  points: number
  usd: number
  hkd: number
}

export interface AstralShardStorePack {
  label: string
  shards: number
  costDp: number
}

export const DDO_POINT_BUNDLES: DdoPointBundle[] = [
  { label: '600 Points', points: 600, usd: 7.99, hkd: 62.3 },
  { label: '1,550 Points', points: 1550, usd: 19.99, hkd: 155.9 },
  { label: '4,100 Points', points: 4100, usd: 49.99, hkd: 389.9 },
  { label: '6,300 Points', points: 6300, usd: 74.99, hkd: 584.9 },
  { label: '11,500 Points', points: 11500, usd: 124.99, hkd: 974.9 },
  { label: '23,000 Points', points: 23000, usd: 199.99, hkd: 1559.9 },
]

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

const DEFAULT_POINTS_PER_HKD_RANGE = getBundlePointsRange(DDO_POINT_BUNDLES)

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

const DEFAULT_SHARDS_PER_HKD_RANGE: ValueRange = {
  min: DEFAULT_POINTS_PER_HKD_RANGE.min / DEFAULT_DP_PER_SHARD_RANGE.max,
  max: DEFAULT_POINTS_PER_HKD_RANGE.max / DEFAULT_DP_PER_SHARD_RANGE.min,
}

export const DEFAULT_CONVERTER_RATES: ConverterRates = {
  // Derived from available DDO Point bundle tiers.
  minPointsPerHkd: DEFAULT_POINTS_PER_HKD_RANGE.min,
  maxPointsPerHkd: DEFAULT_POINTS_PER_HKD_RANGE.max,
  // Derived using bundle Points/HKD range and Astral Shard store DP/Shard range.
  minShardsPerHkd: DEFAULT_SHARDS_PER_HKD_RANGE.min,
  maxShardsPerHkd: DEFAULT_SHARDS_PER_HKD_RANGE.max,
}

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
      shards: makeRange(
        hkd.min * shardsPerHkdRange.min,
        hkd.max * shardsPerHkdRange.max,
      ),
    }
  }

  if (sourceUnit === 'shards') {
    const hkd = makeRange(
      amount / shardsPerHkdRange.max,
      amount / shardsPerHkdRange.min,
    )
    return {
      points: makeRange(
        hkd.min * pointsPerHkdRange.min,
        hkd.max * pointsPerHkdRange.max,
      ),
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
