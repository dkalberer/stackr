import { useState, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Box, Typography, Paper } from '@mui/material'
import type { AllocationItem } from '../../types'
import { accountTypeColor, accountTypeLabel, formatCHF, formatPercent } from '../../utils/format'
import { BG_ELEVATED, BORDER_COLOR } from '../../theme/theme'

interface Props {
  data: AllocationItem[]
  totalNetWorth?: number
  height?: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as AllocationItem

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: accountTypeColor(item.type),
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {accountTypeLabel(item.type)}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'block',
        }}
      >
        {formatCHF(item.balance)}
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontFamily: '"IBM Plex Mono", monospace', color: 'text.secondary' }}
      >
        {formatPercent(item.percentage)}
      </Typography>
    </Paper>
  )
}

export function AllocationDonut({ data, totalNetWorth, height = 260 }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const onMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])
  const onMouseLeave = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const total = totalNetWorth ?? data.reduce((sum, d) => sum + d.balance, 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: '100%', height, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={height * 0.28}
              outerRadius={height * 0.42}
              paddingAngle={2}
              dataKey="balance"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={accountTypeColor(entry.type)}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              mb: 0.25,
            }}
          >
            Nettovermögen
          </Typography>
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '0.875rem',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {formatCHF(total)}
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center',
          px: 1,
        }}
      >
        {data.map((item, index) => (
          <Box
            key={item.type}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              opacity: activeIndex === null || activeIndex === index ? 1 : 0.45,
              transition: 'opacity 0.2s',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '2px',
                backgroundColor: accountTypeColor(item.type),
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.6875rem', letterSpacing: '0.02em' }}
            >
              {accountTypeLabel(item.type)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontVariantNumeric: 'tabular-nums',
                color: 'text.primary',
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              {formatPercent(item.percentage, 0)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
