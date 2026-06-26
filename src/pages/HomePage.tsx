import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface HomePageProps {
  onUsernameSubmit: (username: string) => void
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

export default function HomePage({ onUsernameSubmit }: HomePageProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Enter a GitHub username first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`https://api.github.com/users/${trimmed}`)
      if (!response.ok) {
        throw new Error(`We couldn't find a GitHub user called "${trimmed}".`)
      }
      setLeaving(true)
      window.setTimeout(() => onUsernameSubmit(trimmed), 280)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach GitHub. Try again in a moment.')
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen w-full transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#242428' }}
    >
      <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-8 flex items-center min-h-screen">
        <div className="w-full relative z-10 animate-rise">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="Activity Wall" className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight" style={{ color: COLOR.textPrimary }}>
              Activity Wall
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tighter" style={{ color: COLOR.textPrimary }}>
            Your coding activity,
            <br />
            all in <span style={{ color: COLOR.accent }}>one place</span>
          </h1>

          <p className="mt-6 text-[16px] leading-relaxed" style={{ color: COLOR.textSecondary }}>
            See your commits, languages, contribution streaks, and more turned into a beautiful dashboard.
            <br />
            Type a GitHub username to get started.
          </p>

          <form onSubmit={handleSubmit} className="mt-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
                placeholder="Your GitHub username (e.g. wasteofwifi)"
                disabled={loading}
                className="flex-1 border-2 rounded-2xl px-6 py-4 text-base 
                           focus:outline-none focus:border-[#34343a] 
                           transition-all disabled:opacity-60"
                style={{
                  backgroundColor: COLOR.cardBgAlt,
                  color: COLOR.textPrimary,
                  borderColor: COLOR.border,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="font-semibold text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: COLOR.accent,
                  color: 'white',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = COLOR.accentHover
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = COLOR.accent
                }}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    View dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
            {error && <p className="text-sm mt-4" style={{ color: COLOR.accent }}>{error}</p>}
          </form>

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
