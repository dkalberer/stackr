import apiClient from './client'
import type { BalanceSnapshot } from '../types'

export async function getSnapshots(year?: number, month?: number): Promise<BalanceSnapshot[]> {
  const params: Record<string, number> = {}
  if (year !== undefined) params.year = year
  if (month !== undefined) params.month = month
  const { data } = await apiClient.get<BalanceSnapshot[]>('/api/v1/snapshots', { params })
  return data
}

export async function getSnapshotHistory(accountId: string): Promise<BalanceSnapshot[]> {
  const { data } = await apiClient.get<BalanceSnapshot[]>('/api/v1/snapshots/history', {
    params: { account_id: accountId },
  })
  return data
}

export async function upsertSnapshot(payload: {
  account_id: string
  year: number
  month: number
  balance: number
}): Promise<BalanceSnapshot> {
  const { data } = await apiClient.post<BalanceSnapshot>('/api/v1/snapshots', payload)
  return data
}

export async function bulkUpsertSnapshots(snapshots: Array<{
  account_id: string
  year: number
  month: number
  balance: number
}>): Promise<BalanceSnapshot[]> {
  const { data } = await apiClient.post<BalanceSnapshot[]>('/api/v1/snapshots/bulk', { snapshots })
  return data
}
