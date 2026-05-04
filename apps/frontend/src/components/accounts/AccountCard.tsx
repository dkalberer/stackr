import { Card, CardActionArea, Box, Typography, Skeleton } from '@mui/material'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Account } from '../../types'
import { queryKeys } from '../../types'
import { getSnapshotHistory } from '../../api/snapshots'
import { AccountTypeIcon } from './AccountTypeIcon'
import { AccountSparkline } from '../charts/AccountSparkline'
import { formatCurrency, formatPercent, accountTypeLabel } from '../../utils/format'

interface Props {
  account: Account
  onContextMenu?: (event: React.MouseEvent, account: Account) => void
}

export function AccountCard({ account, onContextMenu }: Props) {
  const navigate = useNavigate()

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: queryKeys.snapshotHistory(account.id),
    queryFn: () => getSnapshotHistory(account.id),
    staleTime: 60_000,
  })

  const sorted = [...snapshots].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const current = sorted[0]?.balance ?? 0
  const previous = sorted[1]?.balance ?? 0
  const momChange = current - previous
  const momPercent = previous !== 0 ? (momChange / Math.abs(previous)) * 100 : 0
  const isPositive = momChange >= 0
  const isLiability = account.type === 'LIABILITY'
  const displayPositive = isLiability ? !isPositive : isPositive

  return (
    <Card
      sx={{
        mb: 1.5,
        borderRadius: 2,
        overflow: 'hidden',
        opacity: account.is_active ? 1 : 0.5,
      }}
      onContextMenu={(e) => onContextMenu?.(e, account)}
    >
      <CardActionArea
        onClick={() => navigate(`/accounts/${account.id}`)}
        sx={{
          p: 2,
          '&:hover .MuiCardActionArea-focusHighlight': {
            opacity: 0.04,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Icon */}
          <AccountTypeIcon type={account.type} size={40} />

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {account.name}
              </Typography>

              {isLoading ? (
                <Skeleton width={80} height={20} />
              ) : (
                <Typography
                  sx={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: isLiability ? 'error.main' : 'text.primary',
                    flexShrink: 0,
                  }}
                >
                  {formatCurrency(current, account.currency || 'CHF')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.02em' }}>
                {account.institution || accountTypeLabel(account.type)}
              </Typography>

              {!isLoading && previous !== 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    color: displayPositive ? 'success.main' : 'error.main',
                  }}
                >
                  {displayPositive ? (
                    <ArrowUpwardRoundedIcon sx={{ fontSize: 11 }} />
                  ) : (
                    <ArrowDownwardRoundedIcon sx={{ fontSize: 11 }} />
                  )}
                  <Typography
                    sx={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'inherit',
                    }}
                  >
                    {formatPercent(Math.abs(momPercent), 1)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Sparkline */}
          {!isLoading && snapshots.length >= 2 && (
            <Box sx={{ flexShrink: 0, ml: 0.5 }}>
              <AccountSparkline snapshots={snapshots} />
            </Box>
          )}
        </Box>
      </CardActionArea>
    </Card>
  )
}
