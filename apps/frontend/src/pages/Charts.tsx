import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Skeleton,
  Chip,
  Paper,
} from '@mui/material'
import { useQuery, useQueries } from '@tanstack/react-query'
import { getDashboardSummary, getNetWorthHistory, getSavingsRateHistory } from '../api/dashboard'
import { getAccounts } from '../api/accounts'
import { getSnapshotHistory } from '../api/snapshots'
import { queryKeys, type BalanceSnapshot } from '../types'
import { NetWorthChart } from '../components/charts/NetWorthChart'
import { SavingsRateChart } from '../components/charts/SavingsRateChart'
import { CashflowChart } from '../components/charts/CashflowChart'
import { AllocationDonut } from '../components/charts/AllocationDonut'
import { formatCHF, formatPercent, formatMonthShort } from '../utils/format'
import { BORDER_COLOR, BG_ELEVATED, ACCOUNT_TYPE_COLORS, TEAL } from '../theme/theme'
import { alpha } from '@mui/material/styles'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type RangeMonths = 12 | 24 | 60 | null

const RANGE_OPTIONS: { label: string; months: RangeMonths }[] = [
  { label: '1J', months: 12 },
  { label: '2J', months: 24 },
  { label: '5J', months: 60 },
  { label: 'Alle', months: null },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2017 }, (_, i) => CURRENT_YEAR - i)

function filterByRange<T extends { year: number; month: number }>(
  data: T[],
  rangeMonths: RangeMonths,
): T[] {
  if (rangeMonths === null) return data
  const now = new Date()
  let cutoffYear = now.getFullYear()
  let cutoffMonth = now.getMonth() + 1 - rangeMonths
  while (cutoffMonth <= 0) {
    cutoffMonth += 12
    cutoffYear -= 1
  }
  return data.filter(
    (d) => d.year > cutoffYear || (d.year === cutoffYear && d.month >= cutoffMonth),
  )
}

interface ChartFilterProps {
  range: RangeMonths
  year: number | null
  onRangeChange: (v: RangeMonths) => void
  onYearChange: (v: number | null) => void
}

function ChartFilter({ range, year, onRangeChange, onYearChange }: ChartFilterProps) {
  const chipSx = (active: boolean) => ({
    fontSize: '0.6875rem',
    fontFamily: '"IBM Plex Mono", monospace',
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? alpha(TEAL, 0.15) : alpha('#fff', 0.05),
    color: active ? TEAL : 'text.secondary',
    border: `1px solid ${active ? alpha(TEAL, 0.35) : BORDER_COLOR}`,
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {RANGE_OPTIONS.map(({ label, months }) => (
          <Chip
            key={label}
            label={label}
            size="small"
            onClick={() => { onRangeChange(months); onYearChange(null) }}
            sx={chipSx(year === null && range === months)}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {YEAR_OPTIONS.map((y) => (
          <Chip
            key={y}
            label={y}
            size="small"
            onClick={() => { onYearChange(y); onRangeChange(12) }}
            sx={chipSx(year === y)}
          />
        ))}
      </Box>
    </Box>
  )
}

function applyFilter<T extends { year: number; month: number }>(
  data: T[],
  range: RangeMonths,
  year: number | null,
): T[] {
  if (year !== null) return data.filter((d) => d.year === year)
  return filterByRange(data, range)
}

const CHART_COLORS = Object.values(ACCOUNT_TYPE_COLORS)

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5, px: 2 }}
    >
      {children}
    </Typography>
  )
}

interface AccountGrowthChartProps {
  accounts: { id: string; name: string }[]
  rangeMonths: RangeMonths
  selectedYear: number | null
}

function AccountGrowthChart({ accounts, rangeMonths, selectedYear }: AccountGrowthChartProps) {
  const queries = useQueries({
    queries: accounts.map((a) => ({
      queryKey: queryKeys.snapshotHistory(a.id),
      queryFn: () => getSnapshotHistory(a.id),
      staleTime: 60_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)

  const allData = useMemo(() => {
    const timeline = new Map<string, Record<string, number>>()

    queries.forEach((result, i) => {
      const snaps = applyFilter(result.data ?? [], rangeMonths, selectedYear)
      snaps.forEach((snap: BalanceSnapshot) => {
        const key = `${snap.year}-${String(snap.month).padStart(2, '0')}`
        const existing = timeline.get(key) ?? ({ year: snap.year, month: snap.month } as Record<string, number>)
        const accountId = accounts[i]?.id
        if (accountId) {
          existing[accountId] = snap.balance / 100
        }
        timeline.set(key, existing)
      })
    })

    return Array.from(timeline.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        ...v,
        label: formatMonthShort(v['month'] as number),
      }))
  }, [queries, accounts, rangeMonths, selectedYear])

  if (isLoading) {
    return <Skeleton variant="rounded" height={220} />
  }

  return (
    <Box sx={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={allData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fill: 'rgba(255,255,255,0.38)',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{
              fill: 'rgba(255,255,255,0.38)',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0))}
            width={44}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <Paper
                  sx={{
                    p: 1.5,
                    border: `1px solid ${BORDER_COLOR}`,
                    background: BG_ELEVATED,
                    borderRadius: 2,
                    minWidth: 140,
                  }}
                >
                  {payload.map((p, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.25 }}>
                      <Typography variant="caption" sx={{ color: p.color as string, fontSize: '0.6875rem' }}>
                        {(p.name as string).slice(0, 16)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                        }}
                      >
                        {formatCHF((p.value as number) * 100)}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              )
            }}
          />
          {accounts.map((a, i) => (
            <Line
              key={a.id}
              type="monotone"
              dataKey={a.id}
              name={a.name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

export function Charts() {
  const [tab, setTab] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [nwRange, setNwRange] = useState<RangeMonths>(12)
  const [nwYear, setNwYear] = useState<number | null>(null)
  const [srRange, setSrRange] = useState<RangeMonths>(24)
  const [srYear, setSrYear] = useState<number | null>(null)
  const [accountRange, setAccountRange] = useState<RangeMonths>(null)
  const [accountYear, setAccountYear] = useState<number | null>(null)
  const [cfRange, setCfRange] = useState<RangeMonths>(24)
  const [cfYear, setCfYear] = useState<number | null>(null)

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  })

  const { data: netWorthHistory = [], isLoading: loadingNWH } = useQuery({
    queryKey: queryKeys.netWorthHistory(120),
    queryFn: () => getNetWorthHistory(120),
    staleTime: 60_000,
  })

  const { data: savingsRate = [], isLoading: loadingSR } = useQuery({
    queryKey: queryKeys.savingsRate(120),
    queryFn: () => getSavingsRateHistory(120),
    staleTime: 60_000,
  })

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    staleTime: 60_000,
  })

  const activeAccounts = accounts.filter((a) => a.is_active)
  const visibleAccountIds =
    selectedAccounts.size > 0
      ? Array.from(selectedAccounts)
      : activeAccounts.slice(0, 4).map((a) => a.id)

  const filteredNetWorth = useMemo(
    () => applyFilter(netWorthHistory, nwRange, nwYear),
    [netWorthHistory, nwRange, nwYear],
  )

  const filteredSR = useMemo(() => {
    const filtered = applyFilter(savingsRate, srRange, srYear)
    if (srYear === null && srRange === null) {
      const firstWithIncome = filtered.findIndex((p) => p.has_income)
      return firstWithIncome >= 0 ? filtered.slice(firstWithIncome) : filtered
    }
    return filtered
  }, [savingsRate, srRange, srYear])

  const filteredCF = useMemo(
    () => applyFilter(savingsRate, cfRange, cfYear),
    [savingsRate, cfRange, cfYear],
  )

  const cfTotals = useMemo(() => {
    const months = filteredCF.filter((p) => p.has_income && p.net_income > 0)
    const totalIncome = months.reduce((s, p) => s + p.net_income, 0)
    const totalSavings = months.reduce((s, p) => s + p.savings_amount, 0)
    const totalExpenses = totalIncome - totalSavings
    const avgRate = months.length > 0
      ? months.reduce((s, p) => s + p.savings_rate, 0) / months.length
      : 0
    return { totalIncome, totalSavings, totalExpenses, avgRate, count: months.length }
  }, [filteredCF])

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Box sx={{ pb: 3, maxWidth: 680, mx: 'auto', animation: 'fadeInUp 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
        >
          Analyse
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          Charts
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ minHeight: 36 }}
        >
          <Tab label="Nettovermögen" />
          <Tab label="Sparquote" />
          <Tab label="Cashflow" />
          <Tab label="Allokation" />
          <Tab label="Konten" />
        </Tabs>
      </Box>

      {/* Tab: Net Worth */}
      {tab === 0 && (
        <>
          <SectionHeader>Nettovermögen über Zeit</SectionHeader>
          <Box sx={{ px: 2 }}>
            <ChartFilter range={nwRange} year={nwYear} onRangeChange={setNwRange} onYearChange={setNwYear} />
            <Card>
              <CardContent>
                {loadingNWH ? (
                  <Skeleton variant="rounded" height={240} />
                ) : filteredNetWorth.length > 0 ? (
                  <NetWorthChart data={filteredNetWorth} height={240} showGrid />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                      Noch keine Daten vorhanden
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}

      {/* Tab: Savings Rate */}
      {tab === 1 && (
        <>
          <SectionHeader>Sparquote</SectionHeader>
          <Box sx={{ px: 2 }}>
            <ChartFilter range={srRange} year={srYear} onRangeChange={setSrRange} onYearChange={setSrYear} />
            <Card>
              <CardContent>
                {loadingSR ? (
                  <Skeleton variant="rounded" height={240} />
                ) : filteredSR.length > 0 ? (
                  <SavingsRateChart data={filteredSR} height={240} />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                      Noch keine Einkommensdaten vorhanden
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {dashboard && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { label: '3M Ø', value: dashboard.trailing_3m_savings_rate },
                  { label: '6M Ø', value: dashboard.trailing_6m_savings_rate },
                  { label: '12M Ø', value: dashboard.trailing_12m_savings_rate },
                ].map(({ label, value }) => (
                  <Chip
                    key={label}
                    label={`${label}: ${formatPercent(value)}`}
                    size="small"
                    sx={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.75rem',
                      backgroundColor: alpha(value >= 0 ? '#4CAF50' : '#EF5350', 0.12),
                      color: value >= 0 ? 'success.main' : 'error.main',
                      border: `1px solid ${alpha(value >= 0 ? '#4CAF50' : '#EF5350', 0.25)}`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Tab: Cashflow */}
      {tab === 2 && (
        <>
          <SectionHeader>Einnahmen & Ausgaben</SectionHeader>
          <Box sx={{ px: 2 }}>
            <ChartFilter range={cfRange} year={cfYear} onRangeChange={setCfRange} onYearChange={setCfYear} />
            <Card>
              <CardContent>
                {loadingSR ? (
                  <Skeleton variant="rounded" height={240} />
                ) : filteredCF.filter((p) => p.has_income).length > 0 ? (
                  <CashflowChart data={filteredCF} height={240} />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                      Noch keine Einkommensdaten vorhanden
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {cfTotals.count > 0 && (
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {[
                  { label: 'Einnahmen', value: formatCHF(cfTotals.totalIncome), color: '#00BFA5' },
                  { label: 'Ausgaben', value: formatCHF(cfTotals.totalExpenses), color: '#FF7043' },
                  {
                    label: 'Gespart',
                    value: formatCHF(cfTotals.totalSavings),
                    color: cfTotals.totalSavings >= 0 ? '#66BB6A' : '#EF5350',
                  },
                  {
                    label: 'Ø Sparquote',
                    value: formatPercent(cfTotals.avgRate),
                    color: cfTotals.avgRate >= 0 ? '#66BB6A' : '#EF5350',
                  },
                ].map(({ label, value, color }) => (
                  <Card key={label} sx={{ background: 'rgba(255,255,255,0.03)' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color,
                        }}
                      >
                        {value}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Tab: Allocation */}
      {tab === 3 && (
        <>
          <SectionHeader>Asset Allocation</SectionHeader>
          <Box sx={{ px: 2 }}>
            <Card>
              <CardContent>
                {loadingDash ? (
                  <Skeleton variant="rounded" height={280} />
                ) : dashboard?.allocation && dashboard.allocation.length > 0 ? (
                  <AllocationDonut
                    data={dashboard.allocation}
                    totalNetWorth={dashboard.current_net_worth}
                    height={280}
                  />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                      Noch keine Daten vorhanden
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}

      {/* Tab: Account Growth */}
      {tab === 4 && (
        <>
          <SectionHeader>Kontoverlauf</SectionHeader>
          <Box sx={{ px: 2, mb: 2 }}>
            <ChartFilter range={accountRange} year={accountYear} onRangeChange={setAccountRange} onYearChange={setAccountYear} />
            {!loadingAccounts && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip
                  label="Alle"
                  size="small"
                  onClick={() => setSelectedAccounts(new Set())}
                  sx={{
                    fontSize: '0.75rem',
                    backgroundColor: selectedAccounts.size === 0 ? alpha(TEAL, 0.15) : alpha('#fff', 0.05),
                    color: selectedAccounts.size === 0 ? TEAL : 'text.secondary',
                    border: `1px solid ${selectedAccounts.size === 0 ? alpha(TEAL, 0.35) : BORDER_COLOR}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                />
                {activeAccounts.map((account, i) => {
                  const isSelected = visibleAccountIds.includes(account.id)
                  const color = CHART_COLORS[i % CHART_COLORS.length]!
                  return (
                    <Chip
                      key={account.id}
                      label={account.name}
                      size="small"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleAccount(account.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleAccount(account.id); e.preventDefault() } }}
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: isSelected && selectedAccounts.size > 0 ? alpha(color, 0.15) : selectedAccounts.size > 0 ? alpha('#fff', 0.05) : alpha(color, 0.15),
                        color: isSelected && selectedAccounts.size > 0 ? color : selectedAccounts.size > 0 ? 'text.secondary' : color,
                        border: `1px solid ${isSelected && selectedAccounts.size > 0 ? alpha(color, 0.35) : selectedAccounts.size > 0 ? BORDER_COLOR : alpha(color, 0.35)}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    />
                  )
                })}
              </Box>
            )}

            <Card>
              <CardContent>
                {loadingAccounts ? (
                  <Skeleton variant="rounded" height={220} />
                ) : visibleAccountIds.length > 0 ? (
                  <AccountGrowthChart
                    accounts={activeAccounts.filter((a) => visibleAccountIds.includes(a.id))}
                    rangeMonths={accountRange}
                    selectedYear={accountYear}
                  />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                      Wähle Konten aus
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  )
}
