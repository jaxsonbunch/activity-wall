import { GitBranch, Clock } from 'lucide-react'
import type { ProjectActivity } from '../types/github'

interface ActiveProjectsProps {
  projects: ProjectActivity[]
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-success'
  if (progress >= 50) return 'bg-warning'
  return 'bg-accent'
}

function formatLastActivity(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function ActiveProjects({ projects }: ActiveProjectsProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Active Projects</h3>
      </div>
      <div className="p-4 space-y-3">
        {projects.map((project) => (
          <div
            key={project.name}
            className="p-3 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{project.name}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{project.commits} commits</span>
                    <span>·</span>
                    <span className="text-success">+{project.additions}</span>
                    <span className="text-accent">-{project.deletions}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="w-3 h-3" />
                <span>{formatLastActivity(project.lastActivity)}</span>
              </div>
            </div>
            <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(project.progress)}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-text-muted">{project.progress}% complete</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
