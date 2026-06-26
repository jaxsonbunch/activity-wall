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
  borderSoft: '#2f2f35',

  textPrimary: '#f4f4f5',
  textSecondary: '#b6b6bd',
  textMuted: '#85858d',

  accent: '#e63946',
  accentHover: '#d62839',
  accentSoft: 'rgba(230,57,70,0.14)',
}

const CLIENT_ID = 'Ov23li3u9hRItUeGGHCh'
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : ''

export default function HomePage({ onUsernameSubmit }: HomePageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) handleGitHubCallback(code)
  }, [])

  const handleGitHubCallback = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const clientSecret = (import.meta as any).env.VITE_GITHUB_CLIENT_SECRET

      if (!clientSecret) {
        throw new Error('Missing GitHub client secret')
      }

      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: clientSecret,
            code,
            redirect_uri: REDIRECT_URI,
          }),
        }
      )

      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        throw new Error(tokenData.error_description || 'OAuth failed')
      }

      const accessToken = tokenData.access_token

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
          'User-Agent': 'Activity-Wall',
        },
      })

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user')
      }

      const user = await userResponse.json()

      setLeaving(true)

      setTimeout(() => {
        onUsernameSubmit(user.login, accessToken)
      }, 220)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setLoading(false)

      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const loginWithGitHub = () => {
    const authUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=read:user repo`

    window.location.href = authUrl
  }

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: COLOR.pageBg }}
    >
      <div
        className="w-full max-w-3xl mx-6 sm:mx-10 lg:mx-16 rounded-3xl p-10 sm:p-14 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(36, 36, 40, 0.65)',
          border: `1px solid rgba(52, 52, 58, 0.8)`,
        }}
      >
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="Activity Wall" className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight" style={{ color: COLOR.textPrimary }}>
            Activity Wall
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tighter"
          style={{ color: COLOR.textPrimary }}
        >
          Your coding activity,
          <br />
          all in <span style={{ color: COLOR.accent }}>one place</span>
        </h1>

        <p className="mt-6 text-[15px] leading-relaxed" style={{ color: COLOR.textSecondary }}>
          Connect your GitHub account to see commits, languages, streaks, and
          contributions in a unified dashboard.
        </p>

        <div className="mt-10">
          <button
            onClick={loginWithGitHub}
            disabled={loading}
            className="w-full sm:w-auto font-semibold text-base px-10 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: COLOR.cardBg,
              color: COLOR.textPrimary,
              border: `1px solid ${COLOR.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLOR.cardBgAlt
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLOR.cardBg
            }}
          >
            <img src="/github.png" alt="GitHub" className="w-5 h-5" />

            {loading ? 'Connecting...' : 'Login with GitHub'}

            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <p className="text-sm mt-6 text-center" style={{ color: COLOR.accent }}>
            {error}
          </p>
        )}

        <div className="mt-10">
          <a
            href="https://github.com/wasteofwifi/activity-wall"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:underline"
            style={{ color: COLOR.textPrimary }}
          >
            <img src="/github.png" alt="GitHub" className="w-5 h-5" />
            Source code
          </a>
        </div>
      </div>
    </div>
  )
}
