import { useState } from 'react'
import { ArrowRight, Github, ExternalLink } from 'lucide-react'

interface HomePageProps {
  onUsernameSubmit: (username: string) => void
}

const COLOR = {
  pageBg: '#17171a',
  cardBg: 'rgba(36, 36, 40, 0.75)',
  border: '#34343a',
  textPrimary: '#f4f4f5',
  textMuted: '#a1a1aa',
  accent: '#e63946',
  accentHover: '#d62839',
}

export default function HomePage({ onUsernameSubmit }: HomePageProps) {
  const [username, setUsername] = useState('')

  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID

  const loginWithGitHub = () => {
    const redirectUri =
      'https://activity-wall.netlify.app/.netlify/functions/github-callback'

    const scope = 'read:user repo'

    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`

    window.location.href = url
  }

  const handleContinue = () => {
    if (!username.trim()) return
    onUsernameSubmit(username.trim())
  }

  return (
    <div
      className="min-h-screen px-6 flex flex-col"
      style={{ backgroundColor: COLOR.pageBg }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center py-6 max-w-6xl mx-auto w-full">
        <div className="text-lg font-semibold" style={{ color: COLOR.textPrimary }}>
          Activity Wall
        </div>

        <a
          href="https://github.com/wasteofwifi/activity-wall"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
          style={{ color: COLOR.textMuted }}
        >
          <Github className="w-4 h-4" />
          GitHub Repo
        </a>
      </div>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-3xl w-full text-center">
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: COLOR.textPrimary }}
          >
            Your GitHub activity,
            <br />
            rebuilt into a <span style={{ color: COLOR.accent }}>clean dashboard</span>
          </h1>

          <p
            className="mt-5 text-lg"
            style={{ color: COLOR.textMuted }}
          >
            A minimal way to explore commits, languages, and contribution history
            without the clutter.
          </p>

          {/* CTA block */}
          <div className="mt-10 flex flex-col gap-4 items-center">
            <button
              onClick={loginWithGitHub}
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold transition-all"
              style={{
                backgroundColor: COLOR.accent,
                color: '#fff',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = COLOR.accentHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = COLOR.accent)
              }
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>

            <span className="text-xs" style={{ color: COLOR.textMuted }}>
              or explore without login
            </span>
          </div>

          {/* Optional username input (still subtle, not primary UI) */}
          <div
            className="mt-10 mx-auto max-w-md rounded-2xl p-5"
            style={{
              backgroundColor: COLOR.cardBg,
              border: `1px solid ${COLOR.border}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter GitHub username"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{
                backgroundColor: '#2a2a2f',
                border: `1px solid ${COLOR.border}`,
                color: COLOR.textPrimary,
              }}
            />

            <button
              onClick={handleContinue}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all"
              style={{
                backgroundColor: '#2a2a2f',
                color: COLOR.textPrimary,
                border: `1px solid ${COLOR.border}`,
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
