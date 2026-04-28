import apiClient from './client'
import type { AuthResponse } from '../types'

export interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/login', payload)
  return data
}

export async function getMe(): Promise<AuthResponse['user']> {
  const { data } = await apiClient.get<AuthResponse['user']>('/api/v1/auth/me')
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/api/v1/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
