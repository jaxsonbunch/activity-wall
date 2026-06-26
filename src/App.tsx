import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const [username, setUsername] = useState<string | null>(
    () => localStorage.getItem('paw_username')
  )

  useEffect(() => {
    if (username) {
      localStorage.setItem('paw_username', username)
    }
  }, [username])

  const handleLogout = () => {
    setUsername(null)
    localStorage.removeItem('paw_username')
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            username ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <HomePage />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            username ? (
              <DashboardPage username={username} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
