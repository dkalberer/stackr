import { Box, IconButton } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import { useNavigate, useLocation } from 'react-router-dom'
import { alpha } from '@mui/material/styles'
import { TEAL, BG_PAPER, BORDER_COLOR } from '../../theme/theme'

const NAV_ITEMS = [
  { icon: <HomeRoundedIcon sx={{ fontSize: 22 }} />, path: '/', label: 'Dashboard' },
  { icon: <AccountBalanceRoundedIcon sx={{ fontSize: 22 }} />, path: '/accounts', label: 'Konten' },
  { icon: <EditCalendarRoundedIcon sx={{ fontSize: 22 }} />, path: '/entry', label: 'Eintrag' },
  { icon: <BarChartRoundedIcon sx={{ fontSize: 22 }} />, path: '/charts', label: 'Charts' },
  { icon: <SettingsRoundedIcon sx={{ fontSize: 22 }} />, path: '/settings', label: 'Einstellungen' },
] as const

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: alpha(BG_PAPER, 0.95),
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BORDER_COLOR}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 56,
          px: 1,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <IconButton
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              sx={{
                borderRadius: '12px',
                width: 44,
                height: 44,
                color: isActive ? TEAL : 'text.disabled',
                backgroundColor: isActive ? alpha(TEAL, 0.12) : 'transparent',
                transition: 'background-color 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: isActive ? alpha(TEAL, 0.18) : alpha('#fff', 0.06),
                },
              }}
            >
              {item.icon}
            </IconButton>
          )
        })}
      </Box>
      {/* Safe area fill — extends nav background into home indicator zone */}
      <Box sx={{ height: 'env(safe-area-inset-bottom)' }} />
    </Box>
  )
}
