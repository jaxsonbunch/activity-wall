import { GitCommit, Folder, Calendar, GitPullRequest } from 'lucide-react'
import type { DashboardStats } from '../types/github'

interface StatsCardsProps {
  stats: DashboardStats
}

const statConfig = [
  { key: 'totalCommits' as const, label: 'Total Commits', icon: GitCommit, color: 'text-accent' },
  { key: 'totalProjects' as const, label: 'Projects', icon: Folder, color: 'text-success' },
  { key: 'activeDays' as const, label: 'Active Days', icon: Calendar, color: 'text-warning' },
  { key: 'linesAdded' as const, label: 'Lines Added', icon: GitPullRequest, color: 'text-info' },
]

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statConfig.map((stat, index) => {
        const Icon = stat.icon
        const value = stats[stat.key]
        return (
          <div
            key={stat.key}
            className="bg-bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-all animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs text-success">
                <span className="text-[10px]">▲</span>
                <span>+12%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{value.toLocaleString()}</p>
            <p className="text-sm text-text-muted mt-1">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}
