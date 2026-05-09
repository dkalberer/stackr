import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Box, Paper, Typography } from '@mui/material'
import type { SavingsRatePoint } from '../../types'
import { formatCHF, formatMonth, formatMonthShort, formatPercent } from '../../utils/format'
import { TEAL, BG_ELEVATED, BORDER_COLOR } from '../../theme/theme'

const INCOME_COLOR = TEAL
const EXPENSE_COLOR = '#FF7043'

interface Props {
  data: SavingsRatePoint[]
  height?: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as SavingsRatePoint & {
    income: number
    expenses: number
    savings: number
  }

  return (
    <Paper
      sx={{
        p: 1.5,
        border: `1px solid ${BORDER_COLOR}`,
        background: BG_ELEVATED,
        borderRadius: 2,
        minWidth: 160,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        {formatMonth(point.year, point.month)}
      </Typography>
      {[
        { label: 'Einnahmen', value: point.income, color: INCOME_COLOR },
        { label: 'Ausgaben', value: point.expenses, color: EXPENSE_COLOR },
        { label: 'Gespart', value: point.savings, color: point.savings >= 0 ? 'success.light' : 'error.light' },
      ].map(({ label, value, color }) => (
        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              color,
            }}
          >
            {formatCHF(value * 100)}
          </Typography>
        </Box>
      ))}
      {point.savings_rate !== 0 && (
        <Box sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${BORDER_COLOR}` }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              color: point.savings_rate >= 0 ? 'success.main' : 'error.main',
              fontWeight: 600,
            }}
          >
            {point.savings_rate >= 0 ? '+' : ''}{formatPercent(point.savings_rate)} Sparquote
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export function CashflowChart({ data, height = 240 }: Props) {
  const chartData = useMemo(() => {
    const filtered = data.filter((p) => p.has_income && p.net_income > 0)
    return filtered
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map((p) => {
        const income = p.net_income / 100
        const savings = p.savings_amount / 100
        const expenses = income - savings
        return {
          ...p,
          label: formatMonthShort(p.month),
          income,
          expenses: Math.max(expenses, 0),
          savings,
        }
      })
  }, [data])

  const maxVal = useMemo(
    () => Math.max(...chartData.map((d) => Math.max(d.income, d.expenses)), 1),
    [chartData],
  )

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, maxVal * 1.1]}
            tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              const abs = Math.abs(v)
              if (abs >= 1000) return (v / 1000).toFixed(0) + 'k'
              return v.toFixed(0)
            }}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="income" name="Einnahmen" fill={INCOME_COLOR} fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expenses" name="Ausgaben" fill={EXPENSE_COLOR} fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={20} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}
