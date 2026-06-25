import { useState } from 'react'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('paw_username'))

  const handleUsernameSubmit = (name: string) => {
    setUsername(name)
    localStorage.setItem('paw_username', name)
  }

  const handleLogout = () => {
    setUsername(null)
    localStorage.removeItem('paw_username')
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {username ? (
        <DashboardPage username={username} onLogout={handleLogout} />
      ) : (
        <HomePage onUsernameSubmit={handleUsernameSubmit} />
      )}
    </div>
  )
}
