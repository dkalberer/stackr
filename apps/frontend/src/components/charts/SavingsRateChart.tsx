import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts'
import { Box, Paper, Typography } from '@mui/material'
import type { SavingsRatePoint } from '../../types'
import { formatMonth, formatMonthShort, formatPercent } from '../../utils/format'
import { TEAL, BG_ELEVATED, BORDER_COLOR } from '../../theme/theme'

interface Props {
  data: SavingsRatePoint[]
  height?: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as SavingsRatePoint
  const rate = point.savings_rate

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
      {payload.map((p) => (
        <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {p.name === 'savings_rate' ? 'Rate' : 'Ø Rolling'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontVariantNumeric: 'tabular-nums',
              color: (p.value as number) >= 0 ? 'success.light' : 'error.light',
              fontWeight: 600,
            }}
          >
            {formatPercent(p.value as number)}
          </Typography>
        </Box>
      ))}
      <Box sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            color: rate >= 0 ? 'success.main' : 'error.main',
            fontWeight: 600,
            display: 'block',
          }}
        >
          {rate >= 0 ? '+' : ''}{formatPercent(rate)} Sparquote
        </Typography>
      </Box>
    </Paper>
  )
}

export function SavingsRateChart({ data, height = 220 }: Props) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    return sorted.map((p, i) => {
      // 3-month rolling average
      const window = sorted.slice(Math.max(0, i - 2), i + 1)
      const rolling = window.reduce((sum, x) => sum + x.savings_rate, 0) / window.length
      return {
        ...p,
        label: formatMonthShort(p.month),
        rolling: parseFloat(rolling.toFixed(1)),
      }
    })
  }, [data])

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
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
            tickFormatter={(v: number) => v.toFixed(0) + '%'}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="savings_rate" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.savings_rate >= 0 ? 'rgba(76,175,80,0.7)' : 'rgba(239,83,80,0.7)'}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="rolling"
            stroke={TEAL}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: TEAL, stroke: BG_ELEVATED, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}
