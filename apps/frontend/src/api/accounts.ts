import apiClient from './client'
import type { Account } from '../types'

export async function getAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>('/api/v1/accounts')
  return data
}

export async function getAccount(id: string): Promise<Account> {
  const { data } = await apiClient.get<Account>(`/api/v1/accounts/${id}`)
  return data
}

export async function createAccount(payload: Omit<Account, 'id' | 'user_id' | 'created_at'>): Promise<Account> {
  const { data } = await apiClient.post<Account>('/api/v1/accounts', payload)
  return data
}

export async function updateAccount(id: string, payload: Partial<Omit<Account, 'id' | 'user_id' | 'created_at'>>): Promise<Account> {
  const { data } = await apiClient.put<Account>(`/api/v1/accounts/${id}`, payload)
  return data
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/accounts/${id}`)
}
