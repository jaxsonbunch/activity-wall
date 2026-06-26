import { useNavigate } from 'react-router-dom'

const COLOR = {
  pageBg: '#17171a',
  textPrimary: '#f4f4f5',
  textMuted: '#a1a1aa',
  accent: '#e63946',
}

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: COLOR.pageBg }}
    >
      <div className="text-center max-w-md">
        <p
          className="text-8xl font-bold tracking-tight mb-4"
          style={{ color: COLOR.accent }}
        >
          404
        </p>
        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: COLOR.textPrimary }}
        >
          Page not found
        </h1>
        <p className="text-sm mb-8" style={{ color: COLOR.textMuted }}>
          This page doesn't exist or was moved.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: COLOR.accent }}
        >
          Go home
        </button>
      </div>
    </div>
  )
}
