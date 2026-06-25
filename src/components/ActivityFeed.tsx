import { GitCommit, GitBranch, Star, GitFork, MessageCircle, CircleDot } from 'lucide-react'
import type { ActivityFeedItem } from '../types/github'

interface ActivityFeedProps {
  items: ActivityFeedItem[]
}

const typeConfig: Record<string, { icon: typeof GitCommit; color: string }> = {
  commit: { icon: GitCommit, color: 'text-accent' },
  push: { icon: GitBranch, color: 'text-accent' },
  create: { icon: GitBranch, color: 'text-success' },
  pull_request: { icon: CircleDot, color: 'text-info' },
  star: { icon: Star, color: 'text-warning' },
  fork: { icon: GitFork, color: 'text-info' },
  issue: { icon: MessageCircle, color: 'text-accent' },
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Activity Feed</h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {items.map((item) => {
          const config = typeConfig[item.type] || typeConfig.commit
          const Icon = config.icon
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-5 py-3 hover:bg-bg-secondary/50 transition-colors border-b border-border last:border-b-0"
            >
              <div className={`w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary leading-relaxed">{item.message}</p>
                {item.details && (
                  <p className="text-xs text-text-muted mt-1 truncate">{item.details}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-text-muted">{formatTimeAgo(item.timestamp)}</span>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-xs text-accent">{item.repo}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
