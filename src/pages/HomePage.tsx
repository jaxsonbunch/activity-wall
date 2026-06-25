import { useState } from 'react'
import { Github, ArrowRight, Star, Code, Zap } from 'lucide-react'

interface HomePageProps {
  onUsernameSubmit: (username: string) => void
}

export default function HomePage({ onUsernameSubmit }: HomePageProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter a GitHub username')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`https://api.github.com/users/${username.trim()}`)
      if (!response.ok) {
        throw new Error('User not found')
      }
      onUsernameSubmit(username.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-accent/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-accent/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-accent/30 rounded-full" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#dc2626 1px, transparent 1px), linear-gradient(90deg, #dc2626 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-md w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="PAW" className="w-16 h-16" />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-accent font-bold text-lg tracking-wider">PROJECT ACTIVITY</span>
          </div>
        </div>

        {/* Central circle with avatar placeholder */}
        <div className="relative">
          <div className="w-40 h-40 rounded-full border-2 border-accent/30 flex items-center justify-center bg-bg-secondary/50 backdrop-blur-sm">
            <div className="w-32 h-32 rounded-full border border-accent/20 flex items-center justify-center bg-bg-secondary">
              <Github className="w-12 h-12 text-accent/60" />
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse-slow" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-text-primary">
            Enter Your <span className="text-accent">GitHub</span> Username
          </h1>
          <p className="text-text-muted text-sm">
            Track your coding activity, contributions, and project progress
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder="e.g. torvalds"
              className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {error && (
            <p className="text-accent text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full">
          <a
            href="https://github.com/wasteofwifi/project-activity"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-bg-secondary border border-border hover:border-accent/50 text-text-secondary hover:text-text-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Star className="w-4 h-4" />
            GitHub Star
          </a>
          <a
            href="https://github.com/wasteofwifi/project-activity"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-bg-secondary border border-border hover:border-accent/50 text-text-secondary hover:text-text-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Code className="w-4 h-4" />
            Source Code
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-text-muted text-xs">
        Project Activity Wall — Track your development journey
      </div>
    </div>
  )
}
