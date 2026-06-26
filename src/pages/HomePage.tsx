import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface HomePageProps {
  onUsernameSubmit: (username: string, token?: string) => void
}

const COLOR = {
  pageBg: '#1b1b1e',
  cardBg: '#242428',
  cardBgAlt: '#2a2a2f',
  border: '#34343a',
  textPrimary: '#f4f4f5',
  textSecondary: '#b6b6bd',
  textMuted: '#85858d',
  accent: '#e63946',
  accentSoft: 'rgba(230,57,70,0.14)',
}

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID
const REDIRECT_URI = window.location.origin

export default function HomePage({ onUsernameSubmit }: HomePageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) handleCallback(code)
  }, [])

  const handleCallback = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/.netlify/functions/github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!data.access_token) {
        throw new Error(data.error || 'OAuth failed')
      }

      const accessToken = data.access_token

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
          'User-Agent': 'Activity-Wall',
        },
      })

      if (!userRes.ok) throw new Error('Failed to fetch user')

      const user = await userRes.json()

      setLeaving(true)

      setTimeout(() => {
        onUsernameSubmit(user.login, accessToken)
      }, 250)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const loginWithGitHub = () => {
    const url =
      `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=read:user repo`

    window.location.href = url
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: COLOR.pageBg }}
    >
      <div className="w-full max-w-md px-6">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'rgba(36,36,40,0.72)',
            border: `1px solid ${COLOR.border}`,
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="logo" className="w-6 h-6 rounded" />
            <span className="text-lg font-bold" style={{ color: COLOR.textPrimary }}>
              Activity Wall
            </span>
          </div>

          <h1
            className="text-3xl font-extrabold leading-tight tracking-tight"
            style={{ color: COLOR.textPrimary }}
          >
            Your coding activity,
            <br />
            all in <span style={{ color: COLOR.accent }}>one place</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed" style={{ color: COLOR.textSecondary }}>
            Connect GitHub to view commits, repositories, languages, and contribution history.
          </p>

          <button
            onClick={loginWithGitHub}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: COLOR.accentSoft,
              color: COLOR.accent,
              border: `1px solid rgba(230,57,70,0.35)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(230,57,70,0.22)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLOR.accentSoft
            }}
          >
            <img src="/GitHub.png" alt="GitHub" className="w-5 h-5" />
            {loading ? 'Connecting...' : 'Login with GitHub'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          {error && (
            <p className="mt-4 text-sm text-center" style={{ color: COLOR.accent }}>
              {error}
            </p>
          )}

          <div className="mt-5 text-center">
            <a
              href="https://github.com/wasteofwifi/activity-wall"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
              style={{ color: COLOR.textMuted }}
            >
              View source code
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
