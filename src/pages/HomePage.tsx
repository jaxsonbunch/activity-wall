import { useState, useEffect } from 'react'
import { ArrowRight, Github } from 'lucide-react'

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

    if (code) {
      handleGitHubCallback(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGitHubCallback = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const clientSecret = (import.meta as any).env.VITE_GITHUB_CLIENT_SECRET

      if (!clientSecret) {
        throw new Error('Missing GitHub client secret')
      }

      // ✅ FIX: GitHub expects x-www-form-urlencoded, NOT JSON
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
        throw new Error('Failed to fetch GitHub user')
      }

      const user = await userResponse.json()

      setLeaving(true)

      setTimeout(() => {
        onUsernameSubmit(user.login, accessToken)
      }, 250)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed'
      )
      setLoading(false)

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )
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
      className={`min-h-screen w-full transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: COLOR.cardBg }}
    >
      <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-8 flex items-center min-h-screen">
        <div className="w-full relative z-10 animate-rise">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="Activity Wall" className="w-6 h-6" />
            <span
              className="font-bold text-xl tracking-tight"
              style={{ color: COLOR.textPrimary }}
            >
              Activity Wall
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tighter"
            style={{ color: COLOR.textPrimary }}
          >
            Your coding activity,
            <br />
            all in{' '}
            <span style={{ color: COLOR.accent }}>one place</span>
          </h1>

          <p
            className="mt-6 text-[16px] leading-relaxed"
            style={{ color: COLOR.textSecondary }}
          >
            Connect your GitHub account to see commits, languages, streaks,
            and more in one dashboard.
          </p>

          <div className="mt-10">
            <button
              onClick={loginWithGitHub}
              disabled={loading}
              className="w-full sm:w-auto font-semibold text-base px-10 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: '#24292f',
                color: 'white',
                border: '1px solid #424a53',
              }}
            >
              <Github className="w-5 h-5" />
              {loading ? 'Connecting...' : 'Login with GitHub'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p
              className="text-sm mt-6 text-center"
              style={{ color: COLOR.accent }}
            >
              {error}
            </p>
          )}

          <div className="mt-12">
            <a
              href="https://github.com/wasteofwifi/activity-wall"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-base font-semibold hover:underline transition-colors rounded-xl px-5 py-3"
              style={{ color: COLOR.textPrimary }}
            >
              <img src="/github.png" alt="GitHub" className="w-5 h-5" />
              Source code
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-rise {
          animation: rise 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
      `}</style>
    </div>
  )
}
