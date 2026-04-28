import { createContext } from 'react'
import type { User } from '../types'

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
