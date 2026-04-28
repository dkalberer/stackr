import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingScreen } from './components/common/LoadingScreen'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Accounts = lazy(() => import('./pages/Accounts').then((m) => ({ default: m.Accounts })))
const AccountDetail = lazy(() => import('./pages/AccountDetail').then((m) => ({ default: m.AccountDetail })))
const MonthlyEntry = lazy(() => import('./pages/MonthlyEntry').then((m) => ({ default: m.MonthlyEntry })))
const Charts = lazy(() => import('./pages/Charts').then((m) => ({ default: m.Charts })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

export default function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/entry" element={<MonthlyEntry />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
  )
}
