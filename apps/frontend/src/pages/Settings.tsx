import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  TextField,
  IconButton,
  InputAdornment,
  Collapse,
} from '@mui/material'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import InstallMobileRoundedIcon from '@mui/icons-material/InstallMobileRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { exportData } from '../api/dashboard'
import { changePassword } from '../api/auth'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { TEAL, BG_PAPER } from '../theme/theme'
import { alpha } from '@mui/material/styles'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function Settings() {
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [logoutOpen, setLogoutOpen] = useState(false)
  const [exportingJson, setExportingJson] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const handleExport = async (format: 'json' | 'csv') => {
    if (format === 'json') setExportingJson(true)
    else setExportingCsv(true)
    try {
      const blob = await exportData(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stackr-export-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess(`Export als ${format.toUpperCase()} heruntergeladen`)
    } catch {
      showError('Export fehlgeschlagen')
    } finally {
      if (format === 'json') setExportingJson(false)
      else setExportingCsv(false)
    }
  }

  const handleChangePassword = async () => {
    if (pwNew !== pwConfirm) {
      showError('Passwörter stimmen nicht überein')
      return
    }
    if (pwNew.length < 8) {
      showError('Neues Passwort muss mindestens 8 Zeichen haben')
      return
    }
    setPwSaving(true)
    try {
      await changePassword(pwCurrent, pwNew)
      showSuccess('Passwort geändert')
      setPwOpen(false)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      showError(status === 401 ? 'Aktuelles Passwort falsch' : 'Fehler beim Ändern des Passworts')
    } finally {
      setPwSaving(false)
    }
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      showSuccess('stackr installiert!')
    }
  }

  return (
    <Box sx={{ pb: 4, maxWidth: 680, mx: 'auto', animation: 'fadeInUp 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
        >
          Konfiguration
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          Einstellungen
        </Typography>
      </Box>

      {/* Profile section */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Profil
        </Typography>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  backgroundColor: alpha(TEAL, 0.12),
                  border: `1px solid ${alpha(TEAL, 0.2)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PersonRoundedIcon sx={{ color: TEAL, fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontFamily: '"Syne", sans-serif' }}>
                  {user?.name ?? '—'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: '0.8125rem',
                  }}
                >
                  {user?.email ?? '—'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Währung
                </Typography>
                <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.9375rem', fontWeight: 600, color: TEAL }}>
                  CHF
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Konto seit
                </Typography>
                <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.9375rem', fontWeight: 600 }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-CH') : '—'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Password change */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Sicherheit
        </Typography>
        <Card>
          <ListItemButton onClick={() => setPwOpen((v) => !v)} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <LockRoundedIcon sx={{ color: TEAL, fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText
              primary="Passwort ändern"
              secondary="Aktuelles Passwort erforderlich"
              primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItemButton>

          <Collapse in={pwOpen}>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Aktuelles Passwort"
                type={showCurrent ? 'text' : 'password'}
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowCurrent((v) => !v)} edge="end">
                        {showCurrent ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Neues Passwort"
                type={showNew ? 'text' : 'password'}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                size="small"
                fullWidth
                helperText="Mindestens 8 Zeichen"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNew((v) => !v)} edge="end">
                        {showNew ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Neues Passwort bestätigen"
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                size="small"
                fullWidth
                error={pwConfirm.length > 0 && pwNew !== pwConfirm}
                helperText={pwConfirm.length > 0 && pwNew !== pwConfirm ? 'Passwörter stimmen nicht überein' : ''}
              />
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => { setPwOpen(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleChangePassword}
                  disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                  startIcon={pwSaving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : null}
                >
                  Speichern
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Card>
      </Box>

      {/* Data export */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Daten exportieren
        </Typography>
        <Card>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleExport('json')}
                disabled={exportingJson}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  {exportingJson ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DataObjectRoundedIcon sx={{ color: TEAL, fontSize: 22 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="JSON Export"
                  secondary="Vollständige Daten als JSON"
                  primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
                <DownloadRoundedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleExport('csv')}
                disabled={exportingCsv}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  {exportingCsv ? (
                    <CircularProgress size={20} />
                  ) : (
                    <TableChartRoundedIcon sx={{ color: '#66BB6A', fontSize: 22 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="CSV Export"
                  secondary="Tabelle für Excel/Numbers"
                  primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
                <DownloadRoundedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* PWA install */}
      {!isPWA && installPrompt && (
        <Box sx={{ px: 2, mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
          >
            App installieren
          </Typography>
          <Card
            sx={{
              borderColor: alpha(TEAL, 0.3),
              background: `linear-gradient(135deg, ${alpha(TEAL, 0.06)} 0%, ${BG_PAPER} 100%)`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InstallMobileRoundedIcon sx={{ color: TEAL, fontSize: 32 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, mb: 0.25 }}>
                    Als App installieren
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Offline-Zugang und natives App-Erlebnis
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleInstall}
                  sx={{ flexShrink: 0 }}
                >
                  Installieren
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* App info */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
        >
          Info
        </Typography>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Version', value: __APP_VERSION__ },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, color: 'text.primary' }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Logout */}
      <Box sx={{ px: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          color="error"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => setLogoutOpen(true)}
          sx={{
            py: 1.25,
            borderRadius: 2,
            fontSize: '0.9375rem',
            fontWeight: 600,
          }}
        >
          Abmelden
        </Button>
      </Box>

      <ConfirmDialog
        open={logoutOpen}
        title="Abmelden"
        message="Möchtest du dich wirklich abmelden? Du wirst zur Anmeldeseite weitergeleitet."
        confirmLabel="Abmelden"
        cancelLabel="Abbrechen"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </Box>
  )
}
