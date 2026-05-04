export type AccountType =
  | 'BANK_ACCOUNT'
  | 'SAVINGS_ACCOUNT'
  | 'PILLAR_3A'
  | 'INVESTMENT_DEPOT'
  | 'CRYPTO'
  | 'REAL_ESTATE'
  | 'LIABILITY'
  | 'OTHER'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  institution: string
  currency: string
  color: string
  is_active: boolean
  notes: string
  created_at: string
}

export interface BalanceSnapshot {
  id: string
  account_id: string
  year: number
  month: number
  balance: number // smallest unit of the account's own currency (Rappen for CHF, cents for EUR/USD)
  exchange_rate: number // rate from account currency to CHF, captured at save time
  created_at: string
  updated_at: string
}

export interface IncomeEntry {
  id: string
  user_id: string
  year: number
  month: number
  gross_income: number // in Rappen
  net_income: number // in Rappen
  notes: string
  created_at: string
}

export interface AllocationItem {
  type: AccountType
  balance: number
  percentage: number
}

export interface NetWorthPoint {
  year: number
  month: number
  net_worth: number
}

export interface DashboardSummary {
  current_net_worth: number
  previous_net_worth: number
  mom_change_absolute: number
  mom_change_percent: number
  current_month_savings_rate: number
  trailing_3m_savings_rate: number
  trailing_6m_savings_rate: number
  trailing_12m_savings_rate: number
  fire_number: number
  net_worth_history: NetWorthPoint[]
  allocation: AllocationItem[]
  current_year: number
  current_month: number
  has_current_month_entry: boolean
}

export interface SavingsRatePoint {
  year: number
  month: number
  savings_rate: number
  savings_amount: number
  net_income: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiError {
  message: string
  code?: string
}

export const queryKeys = {
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  snapshots: (year?: number, month?: number) => ['snapshots', year, month] as const,
  snapshotHistory: (accountId: string) => ['snapshots', 'history', accountId] as const,
  income: (year?: number, month?: number) => ['income', year, month] as const,
  dashboard: ['dashboard', 'summary'] as const,
  savingsRate: (months: number) => ['dashboard', 'savings-rate', months] as const,
} as const
