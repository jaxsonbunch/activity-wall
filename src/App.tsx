import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import { getUserFromToken } from './services/github'

interface AuthState {
  username: string | null
  token: string | null
}

function DashboardRoute({
  auth,
  onLogin,
  onLogout,
}: {
  auth: AuthState
  onLogin: (username: string, token: string) => void
  onLogout: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [exchanging, setExchanging] = useState(false)
  const [exchangeError, setExchangeError] = useState('')

  const urlToken = searchParams.get('token')

  useEffect(() => {
    if (!urlToken) return
    setExchanging(true)
    getUserFromToken(urlToken)
      .then((user) => {
        onLogin(user.login, urlToken)
        setSearchParams({}, { replace: true })
      })
      .catch(() => {
        setExchangeError('GitHub login failed. Please try again.')
        setTimeout(() => navigate('/', { replace: true }), 2000)
      })
      .finally(() => setExchanging(false))
  }, [urlToken])

  if (exchanging || urlToken) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#17171a' }}
      >
        {exchangeError ? (
          <p className="text-sm" style={{ color: '#e63946' }}>{exchangeError}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: '#e6394633', borderTopColor: '#e63946' }}
            />
            <p className="text-sm" style={{ color: '#85858d' }}>Signing you in…</p>
          </div>
        )}
      </div>
    )
  }

  if (!auth.username || !auth.token) {
    return <Navigate to="/" replace />
  }

  return (
    <DashboardPage
      username={auth.username}
      token={auth.token}
      onLogout={onLogout}
    />
  )
}

export default function App() {
  const [username, setUsername] = useState<string | null>(
    () => localStorage.getItem('paw_username')
  )
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('paw_token')
  )

  const handleLogin = (newUsername: string, newToken: string) => {
    setUsername(newUsername)
    setToken(newToken)
    localStorage.setItem('paw_username', newUsername)
    localStorage.setItem('paw_token', newToken)
  }

  const handleLogout = () => {
    setUsername(null)
    setToken(null)
    localStorage.removeItem('paw_username')
    localStorage.removeItem('paw_token')
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            username ? <Navigate to="/dashboard" replace /> : <HomePage />
          }
        />
        <Route
          path="/dashboard"
          element={
            <DashboardRoute
              auth={{ username, token }}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}
