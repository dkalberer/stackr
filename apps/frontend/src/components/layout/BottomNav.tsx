import { Box, ButtonBase, Typography } from '@mui/material'
import { cloneElement } from 'react'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import { useNavigate, useLocation } from 'react-router-dom'
import { alpha } from '@mui/material/styles'
import { TEAL, BG_DEFAULT } from '../../theme/theme'

const NAV_ITEMS = [
  { icon: <HomeRoundedIcon />, path: '/', label: 'Home' },
  { icon: <AccountBalanceRoundedIcon />, path: '/accounts', label: 'Konten' },
  { icon: <EditCalendarRoundedIcon />, path: '/entry', label: 'Eintrag' },
  { icon: <BarChartRoundedIcon />, path: '/charts', label: 'Charts' },
  { icon: <SettingsRoundedIcon />, path: '/settings', label: 'Mehr' },
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
        backgroundColor: alpha(BG_DEFAULT, 0.72),
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        borderTop: `0.5px solid ${alpha('#fff', 0.08)}`,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          height: 48,
          px: 0.5,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <ButtonBase
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              disableRipple
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '2px',
                pb: '4px',
                color: isActive ? TEAL : alpha('#fff', 0.42),
                transition: 'color 180ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.88)' },
              }}
            >
              {cloneElement(item.icon, {
                sx: {
                  fontSize: 24,
                  filter: isActive ? `drop-shadow(0 0 8px ${alpha(TEAL, 0.45)})` : 'none',
                  transition: 'filter 180ms ease',
                },
              })}
              <Typography
                component="span"
                sx={{
                  fontSize: '0.625rem',
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                {item.label}
              </Typography>
            </ButtonBase>
          )
        })}
      </Box>
    </Box>
  )
}
