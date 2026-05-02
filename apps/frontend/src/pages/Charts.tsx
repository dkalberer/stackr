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
import { getDashboardSummary, getSavingsRateHistory } from '../api/dashboard'
import { getAccounts } from '../api/accounts'
import { getSnapshotHistory } from '../api/snapshots'
import { queryKeys, type BalanceSnapshot } from '../types'
import { NetWorthChart } from '../components/charts/NetWorthChart'
import { SavingsRateChart } from '../components/charts/SavingsRateChart'
import { AllocationDonut } from '../components/charts/AllocationDonut'
import { formatCHF, formatPercent, formatMonthShort } from '../utils/format'
import { BORDER_COLOR, BG_ELEVATED, ACCOUNT_TYPE_COLORS } from '../theme/theme'
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
  accountIds: string[]
}

function AccountGrowthChart({ accountIds }: AccountGrowthChartProps) {
  const queries = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: queryKeys.snapshotHistory(id),
      queryFn: () => getSnapshotHistory(id),
      staleTime: 60_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)

  const allData = useMemo(() => {
    const timeline = new Map<string, Record<string, number>>()

    queries.forEach((result, i) => {
      const snaps = result.data ?? []
      snaps.forEach((snap: BalanceSnapshot) => {
        const key = `${snap.year}-${String(snap.month).padStart(2, '0')}`
        const existing = timeline.get(key) ?? ({ year: snap.year, month: snap.month } as Record<string, number>)
        const accountId = accountIds[i]
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
  }, [queries, accountIds])

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
          {accountIds.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
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

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  })

  const { data: savingsRate = [], isLoading: loadingSR } = useQuery({
    queryKey: queryKeys.savingsRate(24),
    queryFn: () => getSavingsRateHistory(24),
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
          <Tab label="Allokation" />
          <Tab label="Konten" />
        </Tabs>
      </Box>

      {/* Tab: Net Worth */}
      {tab === 0 && (
        <>
          <SectionHeader>Nettovermögen über Zeit</SectionHeader>
          <Box sx={{ px: 2 }}>
            <Card>
              <CardContent>
                {loadingDash ? (
                  <Skeleton variant="rounded" height={240} />
                ) : dashboard?.net_worth_history && dashboard.net_worth_history.length > 0 ? (
                  <NetWorthChart data={dashboard.net_worth_history} height={240} showGrid />
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
          <SectionHeader>Sparquote (24 Monate)</SectionHeader>
          <Box sx={{ px: 2 }}>
            <Card>
              <CardContent>
                {loadingSR ? (
                  <Skeleton variant="rounded" height={240} />
                ) : savingsRate.length > 0 ? (
                  <SavingsRateChart data={savingsRate} height={240} />
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

      {/* Tab: Allocation */}
      {tab === 2 && (
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
      {tab === 3 && (
        <>
          <SectionHeader>Kontoverlauf</SectionHeader>
          <Box sx={{ px: 2, mb: 2 }}>
            {!loadingAccounts && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
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
                        backgroundColor: isSelected ? alpha(color, 0.15) : alpha('#fff', 0.05),
                        color: isSelected ? color : 'text.secondary',
                        border: `1px solid ${isSelected ? alpha(color, 0.35) : BORDER_COLOR}`,
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
                  <AccountGrowthChart accountIds={visibleAccountIds} />
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
