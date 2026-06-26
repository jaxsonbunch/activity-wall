import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface HomePageProps {
  onUsernameSubmit: (username: string, token?: string) => void
}

const COLOR = {
  pageBg: '#1b1b1e',
  cardBg: '#242428',
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
      <div className="w-full max-w-2xl px-6">
        <div
          className="rounded-3xl p-10 shadow-2xl"
          style={{
            backgroundColor: 'rgba(36,36,40,0.75)',
            border: `1px solid ${COLOR.border}`,
          }}
        >
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="logo" className="w-7 h-7 rounded" />
            <span className="text-xl font-bold" style={{ color: COLOR.textPrimary }}>
              Activity Wall
            </span>
          </div>

          <h1
            className="text-4xl font-extrabold leading-tight tracking-tight"
            style={{ color: COLOR.textPrimary }}
          >
            Your coding activity,
            <br />
            all in <span style={{ color: COLOR.accent }}>one place</span>
          </h1>

          <p className="mt-4 text-base leading-relaxed" style={{ color: COLOR.textSecondary }}>
            Connect GitHub to see commits, repositories, languages, and contribution history in a clean dashboard.
          </p>

          <button
            onClick={loginWithGitHub}
            disabled={loading}
            className="mt-8 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: COLOR.accentSoft,
              color: '#ffffff',
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
            <span className="text-white font-semibold">
              {loading ? 'Connecting...' : 'Login with GitHub'}
            </span>
            {!loading && <ArrowRight className="w-5 h-5 text-white" />}
          </button>

          {error && (
            <p className="mt-5 text-sm text-center" style={{ color: COLOR.accent }}>
              {error}
            </p>
          )}

          <div className="mt-6 text-center">
            <a
              href="https://github.com/wasteofwifi/activity-wall"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
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
