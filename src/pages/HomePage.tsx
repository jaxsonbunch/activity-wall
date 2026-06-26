const COLOR = {
  pageBg: '#17171a',
  textPrimary: '#f4f4f5',
  textMuted: '#a1a1aa',
  accent: '#e63946',
}

export default function HomePage() {
  const loginWithGitHub = () => {
    window.location.href = '/.netlify/functions/github-auth'
  }

  return (
    <div
      className="min-h-screen px-6 flex flex-col"
      style={{ backgroundColor: COLOR.pageBg }}
    >
      <div className="flex justify-between items-center py-6 max-w-6xl mx-auto w-full">
        <div
          className="flex items-center gap-3 text-lg font-semibold"
          style={{ color: COLOR.textPrimary }}
        >
          <img src="/logo.png" alt="Logo" className="w-6 h-6" />
          Activity Wall
        </div>

        <a
          href="https://github.com/wasteofwifi/activity-wall"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm font-bold"
          style={{ color: '#ffffff' }}
        >
          <img src="/GitHub.png" alt="GitHub" className="w-4 h-4" />
          GitHub Repo
        </a>
      </div>

      <div className="flex-1 flex items-start justify-center pt-16">
        <div className="max-w-3xl w-full text-center">
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: COLOR.textPrimary }}
          >
            Your GitHub activity,
            <br />
            rebuilt into a{' '}
            <span style={{ color: COLOR.accent }}>
              clean dashboard
            </span>
          </h1>

          <p className="mt-5 text-lg" style={{ color: COLOR.textMuted }}>
            A minimal way to explore commits, languages, and contribution history
            without the clutter.
          </p>

          <div className="mt-10 flex flex-col gap-4 items-center">
            <button
              onClick={loginWithGitHub}
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold"
              style={{
                backgroundColor: COLOR.accent,
                color: '#fff',
              }}
            >
              <img src="/GitHub.png" alt="GitHub" className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>

      <div
        className="py-4 text-center text-sm"
        style={{ color: COLOR.textMuted }}
      >
        © Made by{' '}
        <a
          href="https://github.com/wasteofwifi"
          target="_blank"
          rel="noreferrer"
          style={{ color: COLOR.accent }}
          className="font-medium hover:opacity-80 transition"
        >
          taz
        </a>
        {' licensed under '}
        <a
          href="https://github.com/wasteofwifi/activity-wall/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
          style={{ color: COLOR.accent }}
          className="font-medium hover:opacity-80 transition"
        >
          MIT License
        </a>
      </div>
    </div>
  )
}
