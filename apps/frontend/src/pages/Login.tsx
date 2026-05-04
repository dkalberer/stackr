import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { TEAL, BG_PAPER, BG_DEFAULT, BORDER_COLOR } from '../theme/theme'
import { alpha } from '@mui/material/styles'

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
})

type Values = z.infer<typeof schema>

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const { ref: emailRef, ...emailReg } = register('email')
  const { ref: passwordRef, ...passwordReg } = register('password')

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const res = await login(values)
      setAuth(res.token, res.user)
      navigate('/', { replace: true })
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.')
    }
  })

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: BG_DEFAULT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundImage: `
          linear-gradient(rgba(0,191,165,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,191,165,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${alpha(TEAL, 0.06)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Box sx={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              border: `2px solid ${TEAL}`,
              mb: 2,
              boxShadow: `0 0 32px ${alpha(TEAL, 0.2)}`,
            }}
          >
            <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, fontSize: '1.375rem', color: TEAL, letterSpacing: '-0.05em' }}>
              S
            </Typography>
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: `linear-gradient(135deg, #fff 40%, ${TEAL})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            stackr
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Persönliche Vermögensverwaltung
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: BG_PAPER,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 3,
            p: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2.5, color: 'text.primary' }}>
            Anmelden
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.8125rem' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              {...emailReg}
              inputRef={emailRef}
              id="email"
              label="E-Mail"
              type="email"
              fullWidth
              size="small"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: '"IBM Plex Mono", monospace' }}>@</Typography>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              {...passwordReg}
              inputRef={passwordRef}
              id="password"
              label="Passwort"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              size="small"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1, py: 1.25, fontSize: '0.9375rem', fontWeight: 600 }}
            >
              {isSubmitting ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Anmelden'}
            </Button>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.disabled' }}>
          Self-hosted · Daten gehören dir
        </Typography>
      </Box>
    </Box>
  )
}
