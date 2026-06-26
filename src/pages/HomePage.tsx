import { useState } from 'react'
import { ArrowRight, Github } from 'lucide-react'

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
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: COLOR.pageBg }}
    >
      <div
        className="w-full max-w-xl rounded-3xl p-10 backdrop-blur-xl shadow-2xl"
        style={{
          backgroundColor: COLOR.cardBg,
          border: `1px solid ${COLOR.border}`,
        }}
      >
        {/* Title */}
        <h1
          className="text-3xl font-bold text-center"
          style={{ color: COLOR.textPrimary }}
        >
          Activity Wall
        </h1>

        <p
          className="text-center mt-2 text-sm"
          style={{ color: COLOR.textMuted }}
        >
          Your GitHub activity, rebuilt into a story.
        </p>

        {/* GitHub Login */}
        <button
          onClick={loginWithGitHub}
          className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition-all"
          style={{
            backgroundColor: COLOR.accent,
            color: '#ffffff',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = COLOR.accentHover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = COLOR.accent)
          }
        >
          <Github className="w-5 h-5 text-white" />
          Login with GitHub
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-[#2f2f35]" />
          <span className="text-xs" style={{ color: COLOR.textMuted }}>
            or
          </span>
          <div className="flex-1 h-px bg-[#2f2f35]" />
        </div>

        {/* Manual username input */}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter GitHub username"
          className="w-full px-4 py-3 rounded-2xl outline-none"
          style={{
            backgroundColor: '#2a2a2f',
            border: `1px solid ${COLOR.border}`,
            color: COLOR.textPrimary,
          }}
        />

        <button
          onClick={handleContinue}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition-all"
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
  )
}
