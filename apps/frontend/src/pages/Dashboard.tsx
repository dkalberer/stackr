import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Chip,
  Divider,
  Alert,
  AlertTitle,
} from '@mui/material'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDashboardSummary } from '../api/dashboard'
import { queryKeys } from '../types'
import { NetWorthChart } from '../components/charts/NetWorthChart'
import { AllocationDonut } from '../components/charts/AllocationDonut'
import { formatCHF, formatCHFCompact, formatPercent, formatMonth } from '../utils/format'
import { TEAL, BG_PAPER, ORANGE } from '../theme/theme'
import { alpha } from '@mui/material/styles'

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: color ?? 'text.primary',
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
    </Box>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: 'text.disabled',
        letterSpacing: '0.12em',
        display: 'block',
        mb: 1.5,
        px: 2,
      }}
    >
      {children}
    </Typography>
  )
}

export function Dashboard() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardSummary,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const momIsPositive = (data?.mom_change_absolute ?? 0) >= 0

  if (error) {
    return (
      <Box sx={{ p: 2, pt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Fehler beim Laden</AlertTitle>
          Dashboard-Daten konnten nicht geladen werden.
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        pb: 3,
        maxWidth: 680,
        mx: 'auto',
        animation: 'fadeInUp 0.35s ease-out',
      }}
    >
      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          px: 2,
          pt: 3,
          pb: 2,
          mb: 1,
          overflow: 'hidden',
          // Terminal scan line effect
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${alpha(TEAL, 0.4)}, transparent)`,
            animation: 'scanline 6s linear infinite',
            animationPlayState: data ? 'running' : 'paused',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Month badge */}
        {data && (
          <Chip
            label={formatMonth(data.current_year, data.current_month)}
            size="small"
            sx={{
              mb: 1.5,
              height: 22,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              backgroundColor: alpha(TEAL, 0.1),
              color: TEAL,
              border: `1px solid ${alpha(TEAL, 0.25)}`,
              borderRadius: 1,
            }}
          />
        )}

        {/* Net worth */}
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
        >
          Nettovermögen
        </Typography>

        {isLoading ? (
          <>
            <Skeleton width={240} height={52} sx={{ mb: 0.5 }} />
            <Skeleton width={140} height={24} />
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'clamp(2rem, 8vw, 2.75rem)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 0.75,
                // Subtle glow on the number
                textShadow: `0 0 40px ${alpha(TEAL, 0.15)}`,
              }}
            >
              {formatCHF(data?.current_net_worth ?? 0)}
            </Typography>

            {/* MoM change */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  backgroundColor: momIsPositive
                    ? alpha('#4CAF50', 0.12)
                    : alpha('#EF5350', 0.12),
                  border: `1px solid ${momIsPositive ? alpha('#4CAF50', 0.2) : alpha('#EF5350', 0.2)}`,
                }}
              >
                {momIsPositive ? (
                  <ArrowUpwardRoundedIcon sx={{ fontSize: 13, color: 'success.main' }} />
                ) : (
                  <ArrowDownwardRoundedIcon sx={{ fontSize: 13, color: 'error.main' }} />
                )}
                <Typography
                  sx={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: momIsPositive ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCHFCompact(Math.abs(data?.mom_change_absolute ?? 0))}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '0.75rem',
                  color: momIsPositive ? 'success.main' : 'error.main',
                }}
              >
                {momIsPositive ? '+' : '−'}
                {formatPercent(Math.abs(data?.mom_change_percent ?? 0))} MoM
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* ── NET WORTH CHART ───────────────────────────────────── */}
      {isLoading ? (
        <Box sx={{ px: 2, mb: 2 }}>
          <Skeleton variant="rounded" height={200} />
        </Box>
      ) : data?.net_worth_history && data.net_worth_history.length > 0 ? (
        <Box sx={{ px: 2, mb: 2 }}>
          <NetWorthChart data={data.net_worth_history} height={200} />
        </Box>
      ) : null}

      {/* ── SAVINGS RATE ─────────────────────────────────────── */}
      <SectionLabel>Sparquote</SectionLabel>
      <Box sx={{ px: 2, mb: 3 }}>
        <Card>
          <CardContent>
            {isLoading ? (
              <Box sx={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                    <Skeleton width="60%" height={28} sx={{ mx: 'auto' }} />
                    <Skeleton width="80%" height={16} sx={{ mx: 'auto' }} />
                  </Box>
                ))}
              </Box>
            ) : (
              <>
                {/* Current month large */}
                <Box sx={{ textAlign: 'center', mb: 2.5 }}>
                  <Typography
                    sx={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 'clamp(2rem, 8vw, 2.5rem)',
                      fontWeight: 600,
                      letterSpacing: '-0.03em',
                      color: (data?.current_month_savings_rate ?? 0) >= 0 ? 'success.main' : 'error.main',
                      lineHeight: 1,
                    }}
                  >
                    {formatPercent(data?.current_month_savings_rate ?? 0)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    Aktueller Monat
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Trailing averages */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <StatPill
                    label="3M Ø"
                    value={formatPercent(data?.trailing_3m_savings_rate ?? 0)}
                    color={(data?.trailing_3m_savings_rate ?? 0) >= 0 ? 'success.main' : 'error.main'}
                  />
                  <StatPill
                    label="6M Ø"
                    value={formatPercent(data?.trailing_6m_savings_rate ?? 0)}
                    color={(data?.trailing_6m_savings_rate ?? 0) >= 0 ? 'success.main' : 'error.main'}
                  />
                  <StatPill
                    label="12M Ø"
                    value={formatPercent(data?.trailing_12m_savings_rate ?? 0)}
                    color={(data?.trailing_12m_savings_rate ?? 0) >= 0 ? 'success.main' : 'error.main'}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── FIRE NUMBER ──────────────────────────────────────── */}
      <SectionLabel>FIRE</SectionLabel>
      <Box sx={{ px: 2, mb: 3 }}>
        <Card sx={{ background: `linear-gradient(135deg, ${BG_PAPER} 0%, ${alpha(TEAL, 0.04)} 100%)` }}>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton width={200} height={36} sx={{ mb: 0.5 }} />
                <Skeleton width={280} height={18} />
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <LocalFireDepartmentRoundedIcon sx={{ color: ORANGE, fontSize: 18 }} />
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.disabled', letterSpacing: '0.1em' }}
                    >
                      FIRE Ziel (25× Jahresausgaben)
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      letterSpacing: '-0.03em',
                      color: TEAL,
                    }}
                  >
                    {formatCHFCompact(data?.fire_number ?? 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                    Basierend auf deiner Sparquote und deinem Nettovermögen
                  </Typography>
                </Box>

                {data && data.current_net_worth > 0 && data.fire_number > 0 && (
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: TEAL,
                      }}
                    >
                      {formatPercent((data.current_net_worth / data.fire_number) * 100, 0)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      erreicht
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── ASSET ALLOCATION ─────────────────────────────────── */}
      {(!isLoading && data?.allocation && data.allocation.length > 0) && (
        <>
          <SectionLabel>Asset Allocation</SectionLabel>
          <Box sx={{ px: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <AllocationDonut
                  data={data.allocation}
                  totalNetWorth={data.current_net_worth}
                  height={240}
                />
              </CardContent>
            </Card>
          </Box>
        </>
      )}

      {/* ── CTA: Enter this month ────────────────────────────── */}
      {!isLoading && !data?.has_current_month_entry && (
        <Box sx={{ px: 2 }}>
          <Card
            onClick={() => navigate('/entry')}
            sx={{
              cursor: 'pointer',
              borderColor: alpha(TEAL, 0.3),
              background: `linear-gradient(135deg, ${alpha(TEAL, 0.06)} 0%, ${BG_PAPER} 100%)`,
              '&:hover': {
                borderColor: TEAL,
                transform: 'translateY(-1px)',
                boxShadow: `0 8px 24px ${alpha(TEAL, 0.15)}`,
              },
              transition: 'all 0.2s',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EditCalendarRoundedIcon sx={{ color: TEAL, fontSize: 24, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 600, color: TEAL, lineHeight: 1.3 }}>
                  Monatsdaten eintragen
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {data && formatMonth(data.current_year, data.current_month)} noch nicht erfasst
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto', color: TEAL, fontSize: '1.25rem' }}>→</Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}

