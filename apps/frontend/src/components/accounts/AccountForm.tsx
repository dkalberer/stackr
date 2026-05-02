import { useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Box,
  Typography,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Account, AccountType } from '../../types'
import { queryKeys } from '../../types'
import { createAccount, updateAccount } from '../../api/accounts'
import { accountTypeLabel, accountTypeColor } from '../../utils/format'
import { AccountTypeIcon } from './AccountTypeIcon'
import { useToast } from '../../hooks/useToast'
import { TEAL } from '../../theme/theme'

const ACCOUNT_TYPES: AccountType[] = [
  'BANK_ACCOUNT',
  'SAVINGS_ACCOUNT',
  'PILLAR_3A',
  'INVESTMENT_DEPOT',
  'CRYPTO',
  'REAL_ESTATE',
  'LIABILITY',
  'OTHER',
]

const PRESET_COLORS = [
  '#00BFA5', '#42A5F5', '#66BB6A', '#7C4DFF',
  '#FF6E40', '#FFA726', '#EF5350', '#78909C',
  '#EC407A', '#26C6DA', '#D4E157', '#FF7043',
]

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Max. 100 Zeichen'),
  type: z.enum([
    'BANK_ACCOUNT', 'SAVINGS_ACCOUNT', 'PILLAR_3A',
    'INVESTMENT_DEPOT', 'CRYPTO', 'REAL_ESTATE', 'LIABILITY', 'OTHER',
  ] as const),
  institution: z.string().max(100, 'Max. 100 Zeichen').optional().default(''),
  currency: z.string().min(1).max(3).default('CHF'),
  color: z.string().default(TEAL),
  notes: z.string().max(500, 'Max. 500 Zeichen').optional().default(''),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  account?: Account | null
  onClose: () => void
}

export function AccountForm({ open, account, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const isEdit = !!account

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'BANK_ACCOUNT',
      institution: '',
      currency: 'CHF',
      color: TEAL,
      notes: '',
      is_active: true,
    },
  })

  const selectedType = watch('type')

  useEffect(() => {
    if (open) {
      if (account) {
        reset({
          name: account.name,
          type: account.type,
          institution: account.institution ?? '',
          currency: account.currency ?? 'CHF',
          color: account.color ?? TEAL,
          notes: account.notes ?? '',
          is_active: account.is_active,
        })
      } else {
        reset({
          name: '',
          type: 'BANK_ACCOUNT',
          institution: '',
          currency: 'CHF',
          color: TEAL,
          notes: '',
          is_active: true,
        })
      }
    }
  }, [open, account, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        type: values.type,
        institution: values.institution ?? '',
        currency: values.currency,
        color: values.color,
        notes: values.notes ?? '',
        is_active: values.is_active,
      }
      return isEdit ? updateAccount(account!.id, payload) : createAccount(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      showSuccess(isEdit ? 'Konto aktualisiert' : 'Konto erstellt')
      onClose()
    },
    onError: () => {
      showError('Fehler beim Speichern')
    },
  })

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values)
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, m: 2, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountTypeIcon type={selectedType} size={36} />
          <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontSize: '1.0625rem' }}>
            {isEdit ? 'Konto bearbeiten' : 'Neues Konto'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Kontoname"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                autoFocus
                size="small"
                placeholder="z.B. UBS Privatkonto"
              />
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small" error={!!errors.type}>
                <InputLabel>Kontotyp</InputLabel>
                <Select {...field} label="Kontotyp">
                  {ACCOUNT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: accountTypeColor(type),
                            flexShrink: 0,
                          }}
                        />
                        {accountTypeLabel(type)}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
              </FormControl>
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 2 }}>
              <Controller
                name="institution"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Institut"
                    fullWidth
                    error={!!errors.institution}
                    helperText={errors.institution?.message}
                    size="small"
                    placeholder="z.B. UBS AG"
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Währung"
                    fullWidth
                    error={!!errors.currency}
                    size="small"
                    placeholder="CHF"
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Color picker */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 1,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Farbe
            </Typography>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {PRESET_COLORS.map((c) => (
                    <Box
                      key={c}
                      onClick={() => field.onChange(c)}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: field.value === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: field.value === c ? `0 0 0 1px ${c}` : 'none',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        '&:hover': { transform: 'scale(1.15)' },
                        '&:focus': { outline: `2px solid ${TEAL}`, outlineOffset: 2 },
                        '&:focus-visible': { outline: `2px solid ${TEAL}`, outlineOffset: 2 },
                      }}
                    />
                  ))}
                </Box>
              )}
            />
          </Box>

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notizen"
                fullWidth
                multiline
                rows={2}
                error={!!errors.notes}
                helperText={errors.notes?.message}
                size="small"
                placeholder="Optional"
              />
            )}
          />

          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aktives Konto
                  </Typography>
                }
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting || mutation.isPending}
        >
          {isEdit ? 'Speichern' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
