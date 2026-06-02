import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEffect, useMemo, useState } from 'react'

import { useCraftingStorage } from '@/hooks/useCraftingStorage'
import {
  ASTRAL_SHARD_STORE_PACKS,
  DDO_POINT_BUNDLES,
  DEFAULT_CONVERTER_RATES,
  convertFromSource,
  formatAmount,
  formatRange,
  getHkdPerPointRange,
  parseNonNegativeNumber,
} from '@/utils/currencyConverter'

const SOURCE_UNIT_KEY = 'converter-source-unit'
const SOURCE_AMOUNT_KEY = 'converter-source-amount'
const SOURCE_FIAT_KEY = 'converter-source-fiat'

type FiatSourceUnit = 'usd' | 'hkd' | 'cny' | 'gbp'
type SourceUnitOption = 'points' | 'shards' | 'fiat'
type EditableUnit = 'points' | 'shards' | FiatSourceUnit
type ChartDataset = 'points' | 'shards'

interface FiatRates {
  usd: number
  hkd: number
  cny: number
  gbp: number
  date?: string
}

type FiatCode = 'usd' | 'hkd' | 'cny' | 'gbp'

const DEFAULT_FIAT_RATES: FiatRates = {
  usd: 1,
  hkd: 7.8,
  cny: 7.2,
  gbp: 0.78,
}

const FIAT_META: Record<FiatCode, { label: string; symbol: string; flagUrl: string; flagAlt: string }> = {
  usd: {
    label: 'USD',
    symbol: '$',
    flagUrl: 'https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/us.svg',
    flagAlt: 'United States flag',
  },
  hkd: {
    label: 'HKD',
    symbol: '$',
    flagUrl: 'https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/hk.svg',
    flagAlt: 'Hong Kong flag',
  },
  cny: {
    label: 'CNY',
    symbol: '¥',
    flagUrl: 'https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/cn.svg',
    flagAlt: 'China flag',
  },
  gbp: {
    label: 'GBP',
    symbol: '£',
    flagUrl: 'https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/gb.svg',
    flagAlt: 'United Kingdom flag',
  },
}

async function fetchUsdRates(
  apiVersion: 'v1',
): Promise<{ usd: number; hkd: number; cny: number; gbp: number; date?: string }> {
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/${apiVersion}/currencies/usd.json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch USD rates')
  }

  const data = (await response.json()) as Record<string, unknown>
  const usd = data.usd as Record<string, unknown> | undefined
  if (!usd || typeof usd !== 'object') {
    throw new Error('Invalid USD rate payload')
  }

  const hkd = Number(usd.hkd)
  const cny = Number(usd.cny)
  const gbp = Number(usd.gbp)

  if (
    !Number.isFinite(hkd) || hkd <= 0 ||
    !Number.isFinite(cny) || cny <= 0 ||
    !Number.isFinite(gbp) || gbp <= 0
  ) {
    throw new Error('Invalid USD rate payload')
  }

  return {
    usd: 1,
    hkd,
    cny,
    gbp,
    date: typeof data.date === 'string' ? data.date : undefined,
  }
}

function scaleRange(range: { min: number; max: number }, factor: number): { min: number; max: number } {
  return {
    min: range.min * factor,
    max: range.max * factor,
  }
}

function FlagLabel({ code }: { code: FiatCode }) {
  const meta = FIAT_META[code]

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        component="img"
        src={meta.flagUrl}
        alt={meta.flagAlt}
        sx={{ width: 16, height: 12, borderRadius: '2px', border: '1px solid', borderColor: 'divider' }}
      />
      <Box component="span">{meta.label}</Box>
    </Box>
  )
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function buildRangeAreaPath(
  minPoints: Array<{ x: number; y: number }>,
  maxPoints: Array<{ x: number; y: number }>,
): string {
  if (minPoints.length === 0 || maxPoints.length === 0) {
    return ''
  }

  const start = `M ${minPoints[0].x} ${minPoints[0].y}`
  const lower = minPoints.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')
  const upper = [...maxPoints].reverse().map((point) => `L ${point.x} ${point.y}`).join(' ')

  return `${start} ${lower} ${upper} Z`
}

export default function CurrencyConverter() {
  const [sourceUnit, setSourceUnit] = useCraftingStorage<SourceUnitOption>(SOURCE_UNIT_KEY, 'points')
  const [sourceFiat, setSourceFiat] = useCraftingStorage<FiatSourceUnit>(SOURCE_FIAT_KEY, 'hkd')
  const [sourceAmountInput, setSourceAmountInput] = useCraftingStorage<string>(SOURCE_AMOUNT_KEY, '245')
  const [fiatRates, setFiatRates] = useState<FiatRates>(DEFAULT_FIAT_RATES)
  const [rateDate, setRateDate] = useState<string | null>(null)
  const [rateLoading, setRateLoading] = useState(true)
  const [rateError, setRateError] = useState<string | null>(null)
  const [editingUnit, setEditingUnit] = useState<EditableUnit | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [chartDataset, setChartDataset] = useState<ChartDataset>('points')
  const [isChartExpanded, setIsChartExpanded] = useState(true)
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null)

  useEffect(() => {
    const legacySource = String(sourceUnit)

    if (legacySource === 'hkd' || legacySource === 'cny' || legacySource === 'gbp') {
      setSourceFiat(legacySource)
      setSourceUnit('fiat')
    }
  }, [setSourceFiat, setSourceUnit, sourceUnit])

  useEffect(() => {
    let cancelled = false

    const loadRates = async () => {
      setRateLoading(true)
      setRateError(null)

      try {
        const rates = await fetchUsdRates('v1')

        if (cancelled) return

        setFiatRates({
          usd: rates.usd,
          hkd: rates.hkd,
          cny: rates.cny,
          gbp: rates.gbp,
        })
        setRateDate(rates.date ?? null)
      } catch {
        if (cancelled) return
        setRateError('Unable to fetch live FX rates. Using fallback rates.')
      } finally {
        if (!cancelled) {
          setRateLoading(false)
        }
      }
    }

    void loadRates()

    return () => {
      cancelled = true
    }
  }, [])

  const sourceAmountParsed = parseNonNegativeNumber(sourceAmountInput)

  const amountError = sourceAmountParsed === null ? 'Enter a valid non-negative number.' : null
  const selectedFiatMeta = FIAT_META[sourceFiat]

  const values = useMemo(() => {
    if (amountError) {
      return {
        points: { min: 0, max: 0 },
        shards: { min: 0, max: 0 },
        hkd: { min: 0, max: 0 },
      }
    }

    const amount = sourceAmountParsed ?? 0
    if (sourceUnit === 'fiat') {
      const hkdPerSelectedFiat = fiatRates.hkd / fiatRates[sourceFiat]
      return convertFromSource('hkd', amount * hkdPerSelectedFiat, {
        minPointsPerHkd: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
        maxPointsPerHkd: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
        minShardsPerHkd: DEFAULT_CONVERTER_RATES.minShardsPerHkd,
        maxShardsPerHkd: DEFAULT_CONVERTER_RATES.maxShardsPerHkd,
      })
    }

    return convertFromSource(sourceUnit, sourceAmountParsed ?? 0, {
      minPointsPerHkd: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
      maxPointsPerHkd: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
      minShardsPerHkd: DEFAULT_CONVERTER_RATES.minShardsPerHkd,
      maxShardsPerHkd: DEFAULT_CONVERTER_RATES.maxShardsPerHkd,
    })
  }, [amountError, fiatRates, sourceAmountParsed, sourceFiat, sourceUnit])

  const usdValues = useMemo(() => {
    const usdPerHkd = fiatRates.usd / fiatRates.hkd
    return scaleRange(values.hkd, usdPerHkd)
  }, [fiatRates.hkd, fiatRates.usd, values.hkd])

  const cnyValues = useMemo(() => {
    const cnyPerHkd = fiatRates.cny / fiatRates.hkd
    return scaleRange(values.hkd, cnyPerHkd)
  }, [fiatRates.cny, fiatRates.hkd, values.hkd])

  const gbpValues = useMemo(() => {
    const gbpPerHkd = fiatRates.gbp / fiatRates.hkd
    return scaleRange(values.hkd, gbpPerHkd)
  }, [fiatRates.gbp, fiatRates.hkd, values.hkd])

  const hkdPerPointRange = useMemo(() => {
    return getHkdPerPointRange({
      min: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
      max: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
    })
  }, [])

  const selectedPerHkd = useMemo(() => {
    return fiatRates[sourceFiat] / fiatRates.hkd
  }, [fiatRates, sourceFiat])

  const selectedFiatValues = useMemo(() => {
    return scaleRange(values.hkd, selectedPerHkd)
  }, [selectedPerHkd, values.hkd])

  const chartEntries = useMemo(() => {
    if (chartDataset === 'points') {
      return DDO_POINT_BUNDLES.map((bundle) => {
        const selectedValue = bundle.usd * fiatRates[sourceFiat]

        return {
          label: bundle.label,
          minXValue: selectedValue,
          maxXValue: selectedValue,
          yValue: bundle.points,
          xLabel: selectedFiatMeta.label,
          yLabel: 'DDO Points',
          annotation: `${formatAmount(bundle.points, 0)} DP`,
        }
      }).sort((left, right) => left.yValue - right.yValue)
    }

    return ASTRAL_SHARD_STORE_PACKS.map((pack) => {
      const dpPerShard = pack.costDp / pack.shards
      const hkdPerShardRange = {
        min: dpPerShard * hkdPerPointRange.min,
        max: dpPerShard * hkdPerPointRange.max,
      }
      const selectedPerShardRange = {
        min: hkdPerShardRange.min * selectedPerHkd,
        max: hkdPerShardRange.max * selectedPerHkd,
      }

      return {
        label: pack.label,
        minXValue: selectedPerShardRange.min * pack.shards,
        maxXValue: selectedPerShardRange.max * pack.shards,
        yValue: pack.shards,
        xLabel: selectedFiatMeta.label,
        yLabel: 'Astral Shards',
        annotation: `${formatAmount(pack.costDp, 0)} DP`,
      }
    }).sort((left, right) => left.yValue - right.yValue)
  }, [chartDataset, fiatRates, hkdPerPointRange.max, hkdPerPointRange.min, selectedFiatMeta.label, selectedPerHkd, sourceFiat])

  const chartSelection = useMemo(() => {
    return {
      xRange: selectedFiatValues,
      yLabel: chartDataset === 'points' ? 'DDO Points' : 'Astral Shards',
    }
  }, [chartDataset, selectedFiatValues])

  const chartGeometry = useMemo(() => {
    const width = 760
    const height = 320
    const padding = { top: 20, right: 28, bottom: 56, left: 82 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const maxXValue = Math.max(...chartEntries.map((entry) => entry.maxXValue), chartSelection.xRange.max, 1)
    const minXValue = Math.min(...chartEntries.map((entry) => entry.minXValue), chartSelection.xRange.min, 0)
    const maxYValue = Math.max(...chartEntries.map((entry) => entry.yValue), 1)
    const minYValue = Math.min(...chartEntries.map((entry) => entry.yValue), 0)
    const xValueRange = maxXValue - minXValue || 1
    const yValueRange = maxYValue - minYValue || 1

    const toX = (value: number) => padding.left + ((value - minXValue) / xValueRange) * innerWidth
    const toY = (value: number) => padding.top + innerHeight - ((value - minYValue) / yValueRange) * innerHeight

    const points = chartEntries.map((entry) => {
      return {
        minX: toX(entry.minXValue),
        maxX: toX(entry.maxXValue),
        y: toY(entry.yValue),
        entry,
      }
    })

    const yEntryLabels = [...points]
      .sort((left, right) => left.y - right.y)
      .reduce<Array<{ y: number; label: string }>>((labels, point) => {
        const minLabelGap = 16
        const last = labels[labels.length - 1]

        if (!last || point.y - last.y >= minLabelGap) {
          labels.push({ y: point.y, label: formatAmount(point.entry.yValue, 0) })
        }

        return labels
      }, [])

    const selectionBox = {
      minX: toX(chartSelection.xRange.min),
      maxX: toX(chartSelection.xRange.max),
    }

    return {
      width,
      height,
      padding,
      points,
      yEntryLabels,
      yAxisTitle: chartDataset === 'points' ? 'DDO Points' : 'Astral Shards',
      selectionBox,
      xTicks: Array.from({ length: 5 }, (_, index) => {
        const fraction = index / 4
        const value = minXValue + fraction * xValueRange
        const x = padding.left + fraction * innerWidth
        return { value, x }
      }),
      yTicks: Array.from({ length: 5 }, (_, index) => {
        const fraction = index / 4
        const value = maxYValue - fraction * yValueRange
        const y = padding.top + fraction * innerHeight
        return { value, y }
      }),
    }
  }, [chartDataset, chartEntries, chartSelection.xRange.max, chartSelection.xRange.min])

  const currentSourceUnit: EditableUnit = sourceUnit === 'fiat' ? sourceFiat : sourceUnit

  const rangeByUnit = useMemo(() => {
    return {
      points: values.points,
      shards: values.shards,
      usd: usdValues,
      hkd: values.hkd,
      cny: cnyValues,
      gbp: gbpValues,
    }
  }, [cnyValues, gbpValues, usdValues, values.hkd, values.points, values.shards])

  const cardUnits: EditableUnit[] = ['points', 'shards', 'usd', 'hkd', 'cny', 'gbp']

  const getRepresentativeValue = (unit: EditableUnit): number => {
    if (currentSourceUnit === unit) {
      return sourceAmountParsed ?? 0
    }

    const range = rangeByUnit[unit]
    return (range.min + range.max) / 2
  }

  const startEdit = (unit: EditableUnit) => {
    setEditingUnit(unit)
    setEditValue(String(getRepresentativeValue(unit)))
    setEditError(null)
  }

  const applyEditedValue = () => {
    if (!editingUnit) return

    const parsed = parseNonNegativeNumber(editValue)
    if (parsed === null) {
      setEditError('Enter a valid non-negative number.')
      return
    }

    if (editingUnit === 'points' || editingUnit === 'shards') {
      setSourceUnit(editingUnit)
    } else {
      setSourceUnit('fiat')
      setSourceFiat(editingUnit)
    }

    setSourceAmountInput(String(parsed))
    setEditingUnit(null)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingUnit(null)
    setEditError(null)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5">Currency Converter</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Convert between DDO Points, Astral Shards, and Hong Kong Dollars. Values are estimated using
          fixed bundle-derived ratios plus live USD FX rates.
        </Typography>
        {rateLoading && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">Loading live FX rates...</Typography>
          </Box>
        )}
        {rateError && (
          <Alert severity="warning" sx={{ mt: 1 }} icon={false}>
            {rateError}
          </Alert>
        )}
        {rateDate && !rateError && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            FX source date: {rateDate}
          </Typography>
        )}
        <Alert severity="info" sx={{ mt: 1 }} icon={false}>
          Use this as planning guidance only. In-game and store prices can change.
        </Alert>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" gap={1.5}>
          <Typography variant="subtitle1" fontWeight="bold">
            Currency
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="converter-fiat-unit-label">Currency</InputLabel>
            <Select
              labelId="converter-fiat-unit-label"
              value={sourceFiat}
              label="Currency"
              onChange={(event) => setSourceFiat(event.target.value as FiatSourceUnit)}
            >
              <MenuItem value="usd"><FlagLabel code="usd" /></MenuItem>
              <MenuItem value="hkd"><FlagLabel code="hkd" /></MenuItem>
              <MenuItem value="cny"><FlagLabel code="cny" /></MenuItem>
              <MenuItem value="gbp"><FlagLabel code="gbp" /></MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          useFlexGap
          flexWrap="wrap"
          justifyContent="space-between"
          alignItems="center"
          gap={1.5}
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Convert between DP/Shard/Currencies
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Choose the value you want to start from, then edit that card directly.
        </Typography>

        <Stack direction="row" useFlexGap flexWrap="wrap" gap={2}>
          {cardUnits.map((unit) => {
            const isSource = currentSourceUnit === unit
            const isEditing = editingUnit === unit
            const range = rangeByUnit[unit]

            const title =
              unit === 'points'
                ? 'DDO Points'
                : unit === 'shards'
                  ? 'Astral Shards'
                  : FIAT_META[unit].label

            const prefix = unit === 'points' || unit === 'shards' ? '' : FIAT_META[unit].symbol
            const display = isSource
              ? `${prefix}${formatAmount(sourceAmountParsed ?? 0, 2)}`
              : `${prefix}${formatRange(range, 2)}`

            return (
              <Paper
                key={unit}
                variant="outlined"
                onClick={() => startEdit(unit)}
                sx={{
                  p: 1.5,
                  minWidth: 200,
                  cursor: 'pointer',
                  borderColor: isSource ? 'primary.main' : 'divider',
                  boxShadow: isSource ? 2 : 0,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {unit === 'points' || unit === 'shards' ? title : <FlagLabel code={unit} />}
                  </Typography>
                  {isSource && (
                    <Typography variant="caption" color="primary.main">
                      Source
                    </Typography>
                  )}
                </Stack>

                {isEditing ? (
                  <TextField
                    autoFocus
                    size="small"
                    type="number"
                    value={editValue}
                    onChange={(event) => {
                      setEditValue(event.target.value)
                      if (editError) setEditError(null)
                    }}
                    onBlur={applyEditedValue}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        applyEditedValue()
                      }
                      if (event.key === 'Escape') {
                        cancelEdit()
                      }
                    }}
                    error={Boolean(editError)}
                    helperText={editError ?? 'Press Enter to apply'}
                    inputProps={{ min: 0, step: 'any' }}
                    sx={{ width: '100%' }}
                  />
                ) : (
                  <Typography variant="h6">{display}</Typography>
                )}
              </Paper>
            )
          })}
        </Stack>

        {amountError && (
          <Alert severity="error" sx={{ mt: 1 }} icon={false}>
            {amountError}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Convert Ratio Chart
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Compare quantity against total {selectedFiatMeta.label} cost, with guide lines for the current starting value.
            </Typography>
          </Box>

          <IconButton
            aria-label={isChartExpanded ? 'Collapse convert ratio chart' : 'Expand convert ratio chart'}
            onClick={() => setIsChartExpanded((current) => !current)}
            size="small"
          >
            {isChartExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>

        <Collapse in={isChartExpanded}>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            <Stack direction="row" gap={1}>
              <Button
                size="small"
                variant={chartDataset === 'points' ? 'contained' : 'outlined'}
                onClick={() => setChartDataset('points')}
              >
                DP Bundles
              </Button>
              <Button
                size="small"
                variant={chartDataset === 'shards' ? 'contained' : 'outlined'}
                onClick={() => setChartDataset('shards')}
              >
                Shard Packs
              </Button>
            </Stack>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            X-axis shows total {selectedFiatMeta.label} cost. Y-axis shows quantity ({chartDataset === 'points' ? 'DDO Points' : 'Astral Shards'}). The band shows the estimated price range for each store option.
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Box component="svg" viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} sx={{ width: '100%', minWidth: 720, height: 'auto', display: 'block' }}>
              {chartGeometry.xTicks.map((tick) => (
                <g key={tick.x}>
                  <line
                    x1={tick.x}
                    x2={tick.x}
                    y1={chartGeometry.padding.top}
                    y2={chartGeometry.height - chartGeometry.padding.bottom}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={tick.x}
                    y={chartGeometry.height - chartGeometry.padding.bottom + 20}
                    textAnchor="middle"
                    fontSize="12"
                    fill="rgba(255,255,255,0.72)"
                  >
                    {selectedFiatMeta.symbol}{formatAmount(tick.value, 0)}
                  </text>
                </g>
              ))}

              {chartGeometry.yTicks.map((tick) => (
                <g key={tick.y}>
                  <line
                    x1={chartGeometry.padding.left}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="4 4"
                  />
                </g>
              ))}

              <text
                x={chartGeometry.padding.left - 10}
                y={chartGeometry.padding.top - 6}
                textAnchor="end"
                fontSize="11"
                fill="rgba(255,255,255,0.5)"
              >
                {chartGeometry.yAxisTitle}
              </text>

              {chartGeometry.yEntryLabels.map((tick) => (
                <text
                  key={tick.label}
                  x={chartGeometry.padding.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="rgba(255,255,255,0.82)"
                >
                  {tick.label}
                </text>
              ))}

              <line
                x1={chartGeometry.padding.left}
                x2={chartGeometry.width - chartGeometry.padding.right}
                y1={chartGeometry.height - chartGeometry.padding.bottom}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="rgba(255,255,255,0.35)"
              />

              <line
                x1={chartGeometry.padding.left}
                x2={chartGeometry.padding.left}
                y1={chartGeometry.padding.top}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="rgba(255,255,255,0.35)"
              />

              <rect
                x={chartGeometry.selectionBox.minX}
                y={chartGeometry.padding.top}
                width={Math.max(chartGeometry.selectionBox.maxX - chartGeometry.selectionBox.minX, 1)}
                height={chartGeometry.height - chartGeometry.padding.top - chartGeometry.padding.bottom}
                fill="rgba(255, 213, 79, 0.12)"
                stroke="none"
              />

              <line
                x1={chartGeometry.selectionBox.minX}
                x2={chartGeometry.selectionBox.minX}
                y1={chartGeometry.padding.top}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="#ffd54f"
                strokeDasharray="6 4"
                strokeWidth="2"
              />

              <line
                x1={chartGeometry.selectionBox.maxX}
                x2={chartGeometry.selectionBox.maxX}
                y1={chartGeometry.padding.top}
                y2={chartGeometry.height - chartGeometry.padding.bottom}
                stroke="#ffd54f"
                strokeDasharray="6 4"
                strokeWidth="2"
              />

              <path
                d={buildRangeAreaPath(
                  chartGeometry.points.map((point) => ({ x: point.minX, y: point.y })),
                  chartGeometry.points.map((point) => ({ x: point.maxX, y: point.y })),
                )}
                fill="rgba(144, 202, 249, 0.22)"
                stroke="none"
              />

              <path
                d={buildLinePath(chartGeometry.points.map((point) => ({ x: point.minX, y: point.y })))}
                fill="none"
                stroke="#90caf9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d={buildLinePath(chartGeometry.points.map((point) => ({ x: point.maxX, y: point.y })))}
                fill="none"
                stroke="#42a5f5"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chartGeometry.points.map((point, index) => {
                const isHovered = hoveredChartIndex === index
                const entry = point.entry
                const tooltipWidth = 210
                const tooltipHeight = 66
                const tooltipX = Math.min(
                  Math.max((point.minX + point.maxX) / 2 - tooltipWidth / 2, chartGeometry.padding.left),
                  chartGeometry.width - chartGeometry.padding.right - tooltipWidth,
                )
                const tooltipY = point.y - tooltipHeight - 12 < chartGeometry.padding.top
                  ? point.y + 14
                  : point.y - tooltipHeight - 12
                const xRangeText = entry.minXValue === entry.maxXValue
                  ? `${selectedFiatMeta.symbol}${formatAmount(entry.minXValue, 2)}`
                  : `${selectedFiatMeta.symbol}${formatAmount(entry.minXValue, 2)} ~ ${formatAmount(entry.maxXValue, 2)}`
                return (
                  <g key={entry.label} onMouseEnter={() => setHoveredChartIndex(index)} onMouseLeave={() => setHoveredChartIndex(null)}>
                    {/* wide invisible hit area */}
                    <rect
                      x={point.minX - 8}
                      y={point.y - 10}
                      width={Math.max(point.maxX - point.minX + 16, 20)}
                      height={20}
                      fill="transparent"
                    />
                    <line
                      x1={point.minX}
                      x2={point.maxX}
                      y1={point.y}
                      y2={point.y}
                      stroke={isHovered ? '#e3f2fd' : 'rgba(255,255,255,0.5)'}
                      strokeWidth={isHovered ? 3 : 2}
                    />
                    <circle cx={point.minX} cy={point.y} r={isHovered ? 6 : 4} fill="#90caf9" stroke="#1e1e1e" strokeWidth="2" />
                    <circle cx={point.maxX} cy={point.y} r={isHovered ? 6 : 4} fill="#42a5f5" stroke="#1e1e1e" strokeWidth="2" />
                    {isHovered && (
                      <g>
                        <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" ry="6" fill="#1e2a38" stroke="rgba(144,202,249,0.55)" strokeWidth="1.5" />
                        <text x={tooltipX + 10} y={tooltipY + 18} fontSize="12" fontWeight="bold" fill="#e3f2fd">{entry.label}</text>
                        <text x={tooltipX + 10} y={tooltipY + 36} fontSize="12" fill="#90caf9">
                          {xRangeText}
                        </text>
                        <text x={tooltipX + 10} y={tooltipY + 54} fontSize="11" fill="rgba(255,255,255,0.55)">{entry.annotation}</text>
                      </g>
                    )}
                  </g>
                )
              })}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Current selection guides: vertical lines show the estimated {selectedFiatMeta.label} range. Hover a point to see details.
          </Typography>
        </Collapse>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Available DDO Point Bundles
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Reference:{' '}
          <Link href="https://ddowiki.com/page/DDO_Point" target="_blank" rel="noopener noreferrer">
            DDO Point
          </Link>
        </Typography>
        <TableContainer>
          <Table size="small" aria-label="DDO point bundle rates">
            <TableHead>
              <TableRow>
                <TableCell>Bundle</TableCell>
                <TableCell align="right">USD</TableCell>
                <TableCell align="right">{selectedFiatMeta.label}</TableCell>
                <TableCell align="right" sx={{ borderLeft: '1px solid', borderColor: 'divider' }}>
                  DP / {selectedFiatMeta.label}
                </TableCell>
                <TableCell align="right">{selectedFiatMeta.label} / DP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DDO_POINT_BUNDLES.map((bundle) => {
                const selectedValue = bundle.usd * fiatRates[sourceFiat]
                const dpPerSelectedCurrency = {
                  min: bundle.points / selectedValue,
                  max: bundle.points / selectedValue,
                }
                const selectedCurrencyPerDp = {
                  min: selectedValue / bundle.points,
                  max: selectedValue / bundle.points,
                }
                return (
                  <TableRow key={bundle.label}>
                    <TableCell component="th" scope="row">
                      {bundle.label}
                    </TableCell>
                    <TableCell align="right">${formatAmount(bundle.usd, 2)}</TableCell>
                    <TableCell align="right">{selectedFiatMeta.symbol}{formatAmount(selectedValue, 2)}</TableCell>
                    <TableCell align="right" sx={{ borderLeft: '1px solid', borderColor: 'divider' }}>
                      {formatRange(dpPerSelectedCurrency, 4)}
                    </TableCell>
                    <TableCell align="right">{formatRange(selectedCurrencyPerDp, 4)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Available Astral Shard Packs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Source: ddowiki Astral Shard store pack data. HKD estimates are derived from the bundle ratio range above. Reference:{' '}
          <Link href="https://ddowiki.com/page/Item:Astral_Shard" target="_blank" rel="noopener noreferrer">
            Item:Astral Shard
          </Link>
        </Typography>
        <TableContainer>
          <Table size="small" aria-label="Astral shard DP to HKD ratio table">
            <TableHead>
              <TableRow>
                <TableCell>Pack</TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                  Cost (DP)
                </TableCell>
                <TableCell align="right">DP / Shard</TableCell>
                <TableCell align="right">Shard / {selectedFiatMeta.label}</TableCell>
                <TableCell align="right">{selectedFiatMeta.label} / Shard</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ASTRAL_SHARD_STORE_PACKS.map((pack) => {
                const dpPerShard = pack.costDp / pack.shards
                const hkdPerShardRange = {
                  min: dpPerShard * hkdPerPointRange.min,
                  max: dpPerShard * hkdPerPointRange.max,
                }
                const selectedPerShardRange = {
                  min: hkdPerShardRange.min * selectedPerHkd,
                  max: hkdPerShardRange.max * selectedPerHkd,
                }
                const shardPerSelectedRange = {
                  min: 1 / selectedPerShardRange.max,
                  max: 1 / selectedPerShardRange.min,
                }

                return (
                  <TableRow key={pack.label}>
                    <TableCell component="th" scope="row">
                      {pack.label}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                      {formatAmount(pack.costDp, 0)}
                    </TableCell>
                    <TableCell align="right">{formatAmount(dpPerShard, 4)}</TableCell>
                    <TableCell align="right">{formatRange(shardPerSelectedRange, 4)}</TableCell>
                    <TableCell align="right">{selectedFiatMeta.symbol}{formatRange(selectedPerShardRange, 4)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  )
}
