import { useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
  Chip,
  Alert,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '../api/accounts'
import { getSnapshotHistory } from '../api/snapshots'
import { queryKeys } from '../types'
import { AccountTypeIcon } from '../components/accounts/AccountTypeIcon'
import { NetWorthChart } from '../components/charts/NetWorthChart'
import { formatCHF, formatPercent, formatMonth, accountTypeLabel } from '../utils/format'
import { TEAL } from '../theme/theme'
import { alpha } from '@mui/material/styles'

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: queryKeys.account(id!),
    queryFn: () => getAccount(id!),
    enabled: !!id,
  })

  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: queryKeys.snapshotHistory(id!),
    queryFn: () => getSnapshotHistory(id!),
    enabled: !!id,
  })

  const sortedSnapshots = useMemo(
    () =>
      [...snapshots].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      }),
    [snapshots],
  )

  const chartData = useMemo(
    () =>
      [...snapshots]
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          return a.month - b.month
        })
        .map((s) => ({ year: s.year, month: s.month, net_worth: s.balance })),
    [snapshots],
  )

  const currentBalance = sortedSnapshots[0]?.balance ?? 0
  const previousBalance = sortedSnapshots[1]?.balance ?? 0
  const momChange = currentBalance - previousBalance
  const momPercent = previousBalance !== 0 ? (momChange / Math.abs(previousBalance)) * 100 : 0

  if (!id) return null

  return (
    <Box sx={{ pb: 3, maxWidth: 680, mx: 'auto', animation: 'fadeInUp 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 2, pb: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: 'text.secondary' }}>
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Zurück
        </Typography>
      </Box>

      {/* Account info */}
      <Box sx={{ px: 2, pb: 2 }}>
        {loadingAccount ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="rounded" width={48} height={48} />
            <Box>
              <Skeleton width={140} height={28} />
              <Skeleton width={80} height={18} />
            </Box>
          </Box>
        ) : account ? (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <AccountTypeIcon type={account.type} size={48} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="h5"
                  sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  {account.name}
                </Typography>
                {!account.is_active && (
                  <Chip label="Archiviert" size="small" sx={{ height: 20, fontSize: '0.625rem' }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {account.institution
                  ? `${account.institution} · ${accountTypeLabel(account.type)}`
                  : accountTypeLabel(account.type)}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Alert severity="error">Konto nicht gefunden</Alert>
        )}
      </Box>

      {/* Balance hero */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Card
          sx={{
            background: `linear-gradient(135deg, rgba(0,191,165,0.06) 0%, transparent 60%)`,
            borderColor: alpha(TEAL, 0.2),
          }}
        >
          <CardContent>
            {loadingSnapshots ? (
              <>
                <Skeleton width={200} height={40} />
                <Skeleton width={120} height={20} />
              </>
            ) : (
              <>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', letterSpacing: '0.1em' }}
                >
                  Aktueller Saldo
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '2rem',
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                    color: account?.type === 'LIABILITY' ? 'error.main' : 'text.primary',
                  }}
                >
                  {formatCHF(currentBalance)}
                </Typography>
                {previousBalance !== 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {momChange >= 0 ? (
                      <ArrowUpwardRoundedIcon sx={{ fontSize: 13, color: 'success.main' }} />
                    ) : (
                      <ArrowDownwardRoundedIcon sx={{ fontSize: 13, color: 'error.main' }} />
                    )}
                    <Typography
                      sx={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: '0.8125rem',
                        color: momChange >= 0 ? 'success.main' : 'error.main',
                        fontWeight: 600,
                      }}
                    >
                      {momChange >= 0 ? '+' : '−'}
                      {formatCHF(Math.abs(momChange))} ({formatPercent(Math.abs(momPercent), 1)}) MoM
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Chart */}
      {!loadingSnapshots && chartData.length >= 2 && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Card>
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography
                variant="overline"
                sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1 }}
              >
                Verlauf
              </Typography>
              <NetWorthChart data={chartData} height={180} showGrid />
            </CardContent>
          </Card>
        </Box>
      )}

      {/* History table */}
      <Box sx={{ px: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Monatlicher Verlauf
        </Typography>
        <Card>
          <TableContainer
            sx={{
              overflowX: 'auto',
              // subtle scrollbar hint on webkit so users know the table is scrollable
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'divider' },
            }}
          >
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Monat</TableCell>
                  <TableCell align="right">Saldo</TableCell>
                  <TableCell align="right">MoM</TableCell>
                  <TableCell align="right">%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingSnapshots ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton width={70} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={70} /></TableCell>
                      <TableCell><Skeleton width={50} /></TableCell>
                    </TableRow>
                  ))
                ) : sortedSnapshots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Keine Einträge vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSnapshots.map((snap, index) => {
                    const prev = sortedSnapshots[index + 1]
                    const change = prev ? snap.balance - prev.balance : null
                    const pct = prev && prev.balance !== 0 ? ((snap.balance - prev.balance) / Math.abs(prev.balance)) * 100 : null
                    const isPos = (change ?? 0) >= 0

                    return (
                      <TableRow key={snap.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' }}>
                          {formatMonth(snap.year, snap.month)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {formatCHF(snap.balance)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.75rem',
                            color: change === null ? 'text.disabled' : isPos ? 'success.main' : 'error.main',
                          }}
                        >
                          {change === null ? '—' : `${isPos ? '+' : '−'}${formatCHF(Math.abs(change))}`}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.75rem',
                            color: pct === null ? 'text.disabled' : isPos ? 'success.main' : 'error.main',
                          }}
                        >
                          {pct === null ? '—' : `${isPos ? '+' : ''}${formatPercent(pct, 1)}`}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </Box>
  )
}
