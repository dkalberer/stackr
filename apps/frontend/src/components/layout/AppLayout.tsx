import { useState, useEffect } from 'react'
import {
  Box,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import { useNavigate, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TEAL, BG_PAPER, BORDER_COLOR, BG_DEFAULT } from '../../theme/theme'

const DRAWER_WIDTH = 220

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <HomeRoundedIcon fontSize="small" />, path: '/' },
  { label: 'Konten', icon: <AccountBalanceRoundedIcon fontSize="small" />, path: '/accounts' },
  { label: 'Monatseintrag', icon: <EditCalendarRoundedIcon fontSize="small" />, path: '/entry' },
  { label: 'Charts', icon: <BarChartRoundedIcon fontSize="small" />, path: '/charts' },
  { label: 'Einstellungen', icon: <SettingsRoundedIcon fontSize="small" />, path: '/settings' },
] as const

interface Props {
  children: React.ReactNode
}

export function AppLayout({ children }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const sideDrawer = !isMobile && (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: BG_PAPER,
          borderRight: `1px solid ${BORDER_COLOR}`,
          backgroundImage: 'none',
        },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            border: `1.5px solid ${TEAL}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: TEAL,
              letterSpacing: '-0.05em',
              lineHeight: 1,
            }}
          >
            S
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '0.9375rem',
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          stackr
        </Typography>
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <List sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{ borderRadius: 2, py: 1 }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 34,
                    color: isActive ? TEAL : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? TEAL : 'text.secondary',
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: TEAL,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ p: 2, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', letterSpacing: '0.04em' }}
        >
          stackr v0.1.0
        </Typography>
      </Box>
    </Drawer>
  )

  return (
    <Box
      sx={{
        display: isMobile ? 'block' : 'flex',
        minHeight: '100vh',
        backgroundColor: BG_DEFAULT,
      }}
    >
      {sideDrawer}

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          pt: isMobile ? 'env(safe-area-inset-top)' : 0,
          pb: isMobile ? 'calc(52px + env(safe-area-inset-bottom))' : 0,
        }}
      >
        {!isOnline && (
          <Alert
            severity="warning"
            sx={{
              borderRadius: 0,
              borderBottom: `1px solid`,
              borderBottomColor: 'warning.dark',
              '& .MuiAlert-message': { fontSize: '0.8125rem' },
            }}
          >
            Offline — Zwischengespeicherte Daten werden angezeigt
          </Alert>
        )}

        <Box>
          {children}
        </Box>
      </Box>

      {isMobile && <BottomNav />}
    </Box>
  )
}
