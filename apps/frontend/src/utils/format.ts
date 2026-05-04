import type { AccountType } from '../types'
import { ACCOUNT_TYPE_COLORS } from '../theme/theme'

/**
 * Format Rappen (integer) to CHF string
 * 150000 → "CHF 1'500.00"
 */
export function formatCHF(rappen: number): string {
  const franken = rappen / 100
  const abs = Math.abs(franken)
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return (franken < 0 ? '−' : '') + 'CHF\u00A0' + formatted
}

/**
 * Format minor units (cents/rappen) to a string in the given currency.
 * 150000, 'USD' → "USD 1'500.00"
 */
export function formatCurrency(minor: number, currency: string): string {
  const major = minor / 100
  const abs = Math.abs(major)
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return (major < 0 ? '−' : '') + currency + ' ' + formatted
}

/**
 * Format Rappen to compact CHF string
 * 1500000 → "CHF 15'000"
 * 150000000 → "CHF 1.5M"
 */
export function formatCHFCompact(rappen: number): string {
  const franken = rappen / 100
  const abs = Math.abs(franken)
  const sign = franken < 0 ? '−' : ''

  if (abs >= 1_000_000) {
    return sign + 'CHF\u00A0' + (abs / 1_000_000).toFixed(2) + 'M'
  }
  if (abs >= 10_000) {
    const formatted = Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")
    return sign + 'CHF\u00A0' + formatted
  }
  return formatCHF(rappen)
}

/**
 * Format percentage
 * 42.5 → "42.5%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals) + '%'
}

/**
 * Format month
 * { year: 2024, month: 1 } → "Jan 2024"
 */
export function formatMonth(year: number, month: number): string {
  const months = [
    'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
  ]
  return `${months[month - 1]} ${year}`
}

/**
 * Format month short (no year)
 */
export function formatMonthShort(month: number): string {
  const months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return months[month - 1] ?? ''
}

/**
 * Get color for account type
 */
export function accountTypeColor(type: AccountType): string {
  return ACCOUNT_TYPE_COLORS[type] ?? ACCOUNT_TYPE_COLORS['OTHER']!
}

/**
 * Get label for account type
 */
export function accountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    BANK_ACCOUNT: 'Bankkonto',
    SAVINGS_ACCOUNT: 'Sparkonto',
    PILLAR_3A: 'Säule 3a',
    INVESTMENT_DEPOT: 'Investmentdepot',
    CRYPTO: 'Krypto',
    REAL_ESTATE: 'Immobilien',
    LIABILITY: 'Verbindlichkeit',
    OTHER: 'Sonstige',
  }
  return labels[type]
}

/**
 * Parse CHF string to Rappen
 * "1500.00" → 150000
 */
export function parseCHFToRappen(value: string): number {
  const cleaned = value.replace(/['\s]/g, '').replace(',', '.')
  const franken = parseFloat(cleaned)
  if (isNaN(franken)) return 0
  return Math.round(franken * 100)
}

/**
 * Format Rappen as input value (CHF decimal)
 * 150000 → "1500.00"
 */
export function rappenToInputValue(rappen: number): string {
  return (rappen / 100).toFixed(2)
}

/**
 * Get change indicator color
 */
export function changeColor(value: number, isLiability = false): 'success.main' | 'error.main' | 'text.secondary' {
  if (value === 0) return 'text.secondary'
  if (isLiability) {
    return value > 0 ? 'error.main' : 'success.main'
  }
  return value > 0 ? 'success.main' : 'error.main'
}
