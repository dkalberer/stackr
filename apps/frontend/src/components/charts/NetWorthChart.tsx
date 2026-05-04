import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Box, Typography, Paper } from '@mui/material'
import { formatCHF, formatMonth, formatMonthShort } from '../../utils/format'
import type { NetWorthPoint } from '../../types'
import { TEAL, BG_ELEVATED, BORDER_COLOR } from '../../theme/theme'

interface Props {
  data: NetWorthPoint[]
  height?: number
  showGrid?: boolean
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as NetWorthPoint
  const value = payload[0]?.value as number

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
          mb: 0.5,
        }}
      >
        {formatMonth(point.year, point.month)}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: TEAL,
        }}
      >
        {formatCHF(value)}
      </Typography>
    </Paper>
  )
}

export function NetWorthChart({ data, height = 220, showGrid = false }: Props) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        label: formatMonthShort(p.month),
        value: p.net_worth,
      })),
    [data],
  )

  const minVal = useMemo(() => Math.min(...data.map((d) => d.net_worth)), [data])
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.net_worth)), [data])
  const padding = (maxVal - minVal) * 0.1

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
              <stop offset="95%" stopColor={TEAL} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={BORDER_COLOR}
              vertical={false}
            />
          )}
          <XAxis
            dataKey="label"
            tick={{
              fill: 'rgba(255,255,255,0.38)',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.04em',
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tick={{
              fill: 'rgba(255,255,255,0.38)',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              // Values come from the API in Rappen (CHF * 100); convert to CHF
              // before applying the compact suffix.
              const chf = v / 100
              const abs = Math.abs(chf)
              if (abs >= 1_000_000) return (chf / 1_000_000).toFixed(1) + 'M'
              if (abs >= 1_000) return (chf / 1_000).toFixed(0) + 'k'
              return chf.toFixed(0)
            }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: TEAL,
              stroke: BG_ELEVATED,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}
