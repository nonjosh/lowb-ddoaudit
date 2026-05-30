import {
  Alert,
  Box,
  CircularProgress,
  Container,
  FormControl,
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

type FiatSourceUnit = 'hkd' | 'cny' | 'gbp'
type SourceUnitOption = 'points' | 'shards' | 'fiat'
type EditableUnit = 'points' | 'shards' | FiatSourceUnit

interface FiatRates {
  hkd: number
  cny: number
  gbp: number
  date?: string
}

type FiatCode = 'hkd' | 'cny' | 'gbp'

const DEFAULT_FIAT_RATES: FiatRates = {
  hkd: 7.8,
  cny: 7.2,
  gbp: 0.78,
}

const FIAT_META: Record<FiatCode, { label: string; symbol: string; flagUrl: string; flagAlt: string }> = {
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
): Promise<{ hkd: number; cny: number; gbp: number; date?: string }> {
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
    const hkdPerCny = fiatRates.hkd / fiatRates.cny
    const hkdPerGbp = fiatRates.hkd / fiatRates.gbp

    if (sourceUnit === 'fiat' && sourceFiat === 'cny') {
      return convertFromSource('hkd', amount * hkdPerCny, {
        minPointsPerHkd: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
        maxPointsPerHkd: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
        minShardsPerHkd: DEFAULT_CONVERTER_RATES.minShardsPerHkd,
        maxShardsPerHkd: DEFAULT_CONVERTER_RATES.maxShardsPerHkd,
      })
    }

    if (sourceUnit === 'fiat' && sourceFiat === 'gbp') {
      return convertFromSource('hkd', amount * hkdPerGbp, {
        minPointsPerHkd: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
        maxPointsPerHkd: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
        minShardsPerHkd: DEFAULT_CONVERTER_RATES.minShardsPerHkd,
        maxShardsPerHkd: DEFAULT_CONVERTER_RATES.maxShardsPerHkd,
      })
    }

    return convertFromSource(sourceUnit === 'fiat' ? 'hkd' : sourceUnit, sourceAmountParsed ?? 0, {
      minPointsPerHkd: DEFAULT_CONVERTER_RATES.minPointsPerHkd,
      maxPointsPerHkd: DEFAULT_CONVERTER_RATES.maxPointsPerHkd,
      minShardsPerHkd: DEFAULT_CONVERTER_RATES.minShardsPerHkd,
      maxShardsPerHkd: DEFAULT_CONVERTER_RATES.maxShardsPerHkd,
    })
  }, [amountError, fiatRates.cny, fiatRates.gbp, fiatRates.hkd, sourceAmountParsed, sourceFiat, sourceUnit])

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

  const currentSourceUnit: EditableUnit = sourceUnit === 'fiat' ? sourceFiat : sourceUnit

  const rangeByUnit = useMemo(() => {
    return {
      points: values.points,
      shards: values.shards,
      hkd: values.hkd,
      cny: cnyValues,
      gbp: gbpValues,
    }
  }, [cnyValues, gbpValues, values.hkd, values.points, values.shards])

  const cardUnits: EditableUnit[] = ['points', 'shards', 'hkd', 'cny', 'gbp']

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
            Convert From
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Click any card to edit it as the source value.
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
