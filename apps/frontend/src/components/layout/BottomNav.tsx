import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <HomeRoundedIcon />, path: '/' },
  { label: 'Konten', icon: <AccountBalanceRoundedIcon />, path: '/accounts' },
  { label: 'Charts', icon: <BarChartRoundedIcon />, path: '/charts' },
  { label: 'Einst.', icon: <SettingsRoundedIcon />, path: '/settings' },
] as const

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const currentValue = NAV_ITEMS.findIndex((item) => {
    if (item.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.path)
  })

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={currentValue}
        onChange={(_, newValue: number) => {
          const item = NAV_ITEMS[newValue]
          if (item) navigate(item.path)
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
