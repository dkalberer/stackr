import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Chip,
  Skeleton,
  Alert,
  Divider,
  IconButton,
  CircularProgress,
} from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccounts } from '../api/accounts'
import { getSnapshots, bulkUpsertSnapshots } from '../api/snapshots'
import { getIncome, upsertIncome } from '../api/income'
import { queryKeys, type Account } from '../types'
import { AccountTypeIcon } from '../components/accounts/AccountTypeIcon'
import { formatMonth, rappenToInputValue, parseCHFToRappen, accountTypeLabel } from '../utils/format'
import { useToast } from '../hooks/useToast'
import { alpha } from '@mui/material/styles'

interface AccountEntry {
  account: Account
  value: string
  existingSnapshotId?: string
}

interface IncomeValues {
  gross: string
  net: string
  notes: string
}

export function MonthlyEntry() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [income, setIncome] = useState<IncomeValues>({ gross: '', net: '', notes: '' })

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
  })

  const { data: currentSnapshots, isLoading: loadingCurrent } = useQuery({
    queryKey: queryKeys.snapshots(year, month),
    queryFn: () => getSnapshots(year, month),
  })

  // Previous month snapshots for pre-fill
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const { data: prevSnapshots } = useQuery({
    queryKey: queryKeys.snapshots(prevYear, prevMonth),
    queryFn: () => getSnapshots(prevYear, prevMonth),
  })

  const { data: incomeData, isLoading: loadingIncome } = useQuery({
    queryKey: queryKeys.income(year, month),
    queryFn: () => getIncome(year, month),
  })

  // Build entries whenever data changes
  useEffect(() => {
    const activeAccounts = accounts.filter((a) => a.is_active)
    const newEntries: AccountEntry[] = activeAccounts.map((account) => {
      const current = currentSnapshots?.find((s) => s.account_id === account.id)
      const prev = prevSnapshots?.find((s) => s.account_id === account.id)

      let value = ''
      if (current) {
        value = rappenToInputValue(current.balance)
      } else if (prev) {
        value = rappenToInputValue(prev.balance)
      }

      return {
        account,
        value,
        existingSnapshotId: current?.id,
      }
    })
    setEntries(newEntries)
  }, [accounts, currentSnapshots, prevSnapshots])

  // Set income from data
  useEffect(() => {
    if (incomeData) {
      setIncome({
        gross: rappenToInputValue(incomeData.gross_income),
        net: rappenToInputValue(incomeData.net_income),
        notes: incomeData.notes ?? '',
      })
    } else if (!loadingIncome) {
      setIncome({ gross: '', net: '', notes: '' })
    }
  }, [incomeData, loadingIncome])

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const handleNextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    const now = new Date()
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return
    setMonth(nextM)
    if (month === 12) setYear((y) => y + 1)
  }

  const handleValueChange = useCallback((index: number, value: string) => {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, value }
      return next
    })
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save snapshots
      const snapshots = entries
        .filter((e) => e.value.trim() !== '')
        .map((e) => ({
          account_id: e.account.id,
          year,
          month,
          balance: parseCHFToRappen(e.value),
        }))

      if (snapshots.length > 0) {
        await bulkUpsertSnapshots(snapshots)
      }

      // Save income if values provided
      if (income.gross.trim() || income.net.trim()) {
        await upsertIncome({
          year,
          month,
          gross_income: parseCHFToRappen(income.gross),
          net_income: parseCHFToRappen(income.net),
          notes: income.notes,
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      void queryClient.invalidateQueries({ queryKey: ['income'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      showSuccess(`Daten für ${formatMonth(year, month)} gespeichert`)
    },
    onError: () => showError('Fehler beim Speichern'),
  })

  const hasExistingData = (currentSnapshots?.length ?? 0) > 0 || !!incomeData
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isLoading = loadingAccounts || loadingCurrent

  return (
    <Box sx={{ pb: 3, maxWidth: 680, mx: 'auto', animation: 'fadeInUp 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
        >
          Monatseintrag
        </Typography>

        {/* Month selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevMonth} size="small" sx={{ color: 'text.secondary' }}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {formatMonth(year, month)}
          </Typography>
          <IconButton
            onClick={handleNextMonth}
            size="small"
            disabled={isCurrentMonth}
            sx={{ color: isCurrentMonth ? 'text.disabled' : 'text.secondary' }}
          >
            <ChevronRightRoundedIcon />
          </IconButton>

          {hasExistingData && (
            <Chip
              icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
              label="Erfasst"
              size="small"
              sx={{
                ml: 1,
                height: 22,
                fontSize: '0.6875rem',
                backgroundColor: alpha('#4CAF50', 0.12),
                color: 'success.main',
                border: `1px solid ${alpha('#4CAF50', 0.25)}`,
                borderRadius: 1,
                '& .MuiChip-icon': { color: 'success.main', ml: 0.75 },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Account entries */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Kontosalden
        </Typography>

        {isLoading ? (
          <Card>
            <CardContent>
              {[0, 1, 2].map((i) => (
                <Box key={i} sx={{ mb: i < 2 ? 2 : 0 }}>
                  <Skeleton height={56} />
                </Box>
              ))}
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Alert severity="info">
            Keine aktiven Konten vorhanden. Erstelle zuerst ein Konto unter „Konten".
          </Alert>
        ) : (
          <Card>
            <CardContent sx={{ p: '12px !important' }}>
              {entries.map((entry, index) => {
                const hasExisting = !!entry.existingSnapshotId
                return (
                  <Box key={entry.account.id}>
                    {index > 0 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AccountTypeIcon type={entry.account.type} size={36} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.account.name}
                          </Typography>
                          {hasExisting && (
                            <CheckCircleRoundedIcon sx={{ fontSize: 13, color: 'success.main', flexShrink: 0 }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {entry.account.institution
                            ? `${entry.account.institution} · `
                            : ''}
                          {accountTypeLabel(entry.account.type)}
                          {entry.account.currency !== 'CHF' && ` · ${entry.account.currency}`}
                        </Typography>
                      </Box>
                      <TextField
                        value={entry.value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        size="medium"
                        type="number"
                        slotProps={{
                          htmlInput: {
                            step: '0.01',
                            min: entry.account.type === 'LIABILITY' ? undefined : '0',
                            style: {
                              fontFamily: '"IBM Plex Mono", monospace',
                              fontVariantNumeric: 'tabular-nums',
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              textAlign: 'right',
                              width: 120,
                            },
                          },
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
                                  CHF
                                </Typography>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{
                          flexShrink: 0,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                          },
                          // Hide number input arrows
                          '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                          },
                          '& input[type=number]': { MozAppearance: 'textfield' },
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault()
                            const nextIndex = index + 1
                            if (nextIndex < entries.length) {
                              const nextInput = document.querySelector<HTMLInputElement>(
                                `[data-entry-index="${nextIndex}"] input`
                              )
                              nextInput?.focus()
                              nextInput?.select()
                            }
                          }
                        }}
                        data-entry-index={index}
                      />
                    </Box>
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Income section */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Einkommen
        </Typography>

        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Bruttoeinkommen"
                value={income.gross}
                onChange={(e) => setIncome((v) => ({ ...v, gross: e.target.value }))}
                size="small"
                type="number"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
                          CHF
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                  htmlInput: {
                    style: {
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                    },
                  },
                }}
                sx={{
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                  },
                  '& input[type=number]': { MozAppearance: 'textfield' },
                }}
              />
              <TextField
                label="Nettoeinkommen"
                value={income.net}
                onChange={(e) => setIncome((v) => ({ ...v, net: e.target.value }))}
                size="small"
                type="number"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>
                          CHF
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                  htmlInput: {
                    style: {
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                    },
                  },
                }}
                sx={{
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                  },
                  '& input[type=number]': { MozAppearance: 'textfield' },
                }}
              />
            </Box>
            <TextField
              label="Notizen (optional)"
              value={income.notes}
              onChange={(e) => setIncome((v) => ({ ...v, notes: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Save button */}
      <Box sx={{ px: 2 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || entries.length === 0}
          startIcon={
            saveMutation.isPending
              ? <CircularProgress size={18} sx={{ color: 'inherit' }} />
              : <SaveRoundedIcon />
          }
          sx={{
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 2,
          }}
        >
          {saveMutation.isPending ? 'Speichern...' : `${formatMonth(year, month)} speichern`}
        </Button>
      </Box>
    </Box>
  )
}
