import apiClient from './client'
import type { DashboardSummary, NetWorthPoint, SavingsRatePoint } from '../types'

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary')
  return data
}

export async function getNetWorthHistory(months = 120): Promise<NetWorthPoint[]> {
  const { data } = await apiClient.get<NetWorthPoint[]>('/api/v1/dashboard/net-worth', {
    params: { months },
  })
  return data
}

export async function getSavingsRateHistory(months = 24): Promise<SavingsRatePoint[]> {
  const { data } = await apiClient.get<SavingsRatePoint[]>('/api/v1/dashboard/savings-rate', {
    params: { months },
  })
  return data
}

export async function exportData(format: 'json' | 'csv'): Promise<Blob> {
  const { data } = await apiClient.get(`/api/v1/export/${format}`, {
    responseType: 'blob',
  })
  return data
}
