import apiClient from './client'
import type { IncomeEntry } from '../types'

export async function getIncome(year?: number, month?: number): Promise<IncomeEntry | null> {
  const params: Record<string, number> = {}
  if (year !== undefined) params.year = year
  if (month !== undefined) params.month = month
  const { data } = await apiClient.get<IncomeEntry[]>('/api/v1/income', { params })
  return data.length > 0 ? data[0]! : null
}

export async function upsertIncome(payload: {
  year: number
  month: number
  gross_income: number
  net_income: number
  notes?: string
}): Promise<IncomeEntry> {
  const { data } = await apiClient.post<IncomeEntry>('/api/v1/income', payload)
  return data
}

export async function getIncomeHistory(months = 24): Promise<IncomeEntry[]> {
  const { data } = await apiClient.get<IncomeEntry[]>('/api/v1/income/history', { params: { months } })
  return data
}
