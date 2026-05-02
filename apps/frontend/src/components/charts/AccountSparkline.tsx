import { useMemo } from 'react'
import { Box } from '@mui/material'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { BalanceSnapshot } from '../../types'


interface Props {
  snapshots: BalanceSnapshot[]
  width?: number
  height?: number
  color?: string
}

export function AccountSparkline({ snapshots, width = 80, height = 36, color }: Props) {
  const data = useMemo(() => {
    const sorted = [...snapshots]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
      })
      .slice(-6)
    return sorted.map((s) => ({ value: s.balance }))
  }, [snapshots])

  if (data.length < 2) {
    return <Box sx={{ width, height }} />
  }

  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const trend = last >= first
  const lineColor = color ?? (trend ? '#4CAF50' : '#EF5350')

  return (
    <Box sx={{ width, height, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
