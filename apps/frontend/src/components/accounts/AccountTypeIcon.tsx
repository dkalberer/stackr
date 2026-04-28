import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import CurrencyBitcoinRoundedIcon from '@mui/icons-material/CurrencyBitcoinRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import { Box } from '@mui/material'
import type { AccountType } from '../../types'
import { accountTypeColor } from '../../utils/format'
import { alpha } from '@mui/material/styles'

interface Props {
  type: AccountType
  size?: number
}

const ICON_MAP: Record<AccountType, React.ElementType> = {
  BANK_ACCOUNT: AccountBalanceRoundedIcon,
  SAVINGS_ACCOUNT: SavingsRoundedIcon,
  PILLAR_3A: HealthAndSafetyRoundedIcon,
  INVESTMENT_DEPOT: TrendingUpRoundedIcon,
  CRYPTO: CurrencyBitcoinRoundedIcon,
  REAL_ESTATE: HomeRoundedIcon,
  LIABILITY: CreditCardRoundedIcon,
  OTHER: AccountBalanceWalletRoundedIcon,
}

export function AccountTypeIcon({ type, size = 36 }: Props) {
  const IconComponent = ICON_MAP[type]
  const color = accountTypeColor(type)

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${size * 0.28}px`,
        backgroundColor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <IconComponent sx={{ fontSize: size * 0.52, color }} />
    </Box>
  )
}
