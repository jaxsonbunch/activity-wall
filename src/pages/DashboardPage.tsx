import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import StatsCards from '../components/StatsCards'
import ActivityFeed from '../components/ActivityFeed'
import ActiveProjects from '../components/ActiveProjects'
import ContributionHeatmap from '../components/ContributionHeatmap'
import WeeklyOverview from '../components/WeeklyOverview'
import TopLanguages from '../components/TopLanguages'
import TopRepositories from '../components/TopRepositories'
import { fetchDashboardData } from '../services/github'
import type { GitHubUser, DashboardStats, LanguageStat, WeeklyActivity, ContributionDay, ProjectActivity, ActivityFeedItem, GitHubRepo } from '../types/github'

interface DashboardPageProps {
  username: string
  onLogout: () => void
}

export default function DashboardPage({ username, onLogout }: DashboardPageProps) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [languages, setLanguages] = useState<LanguageStat[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
  const [contributions, setContributions] = useState<ContributionDay[]>([])
  const [projects, setProjects] = useState<ProjectActivity[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([])
  const [topRepos, setTopRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [lastUpdated, setLastUpdated] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchDashboardData(username)
      setUser(data.user)
      setStats(data.stats)
      setLanguages(data.languages)
      setWeeklyActivity(data.weeklyActivity)
      setContributions(data.contributions)
      setProjects(data.projects)
      setActivityFeed(data.activityFeed)
      setTopRepos(data.topRepos)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-accent" />
          <p className="text-text-primary text-lg font-semibold">Failed to load data</p>
          <p className="text-text-muted text-sm">{error}</p>
          <button
            onClick={loadData}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar username={username} avatarUrl={user?.avatar_url || ''} onLogout={onLogout} activeSection={activeSection} onNavigate={setActiveSection} />
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-md border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">Welcome back, <span className="text-accent">{user?.name || username}</span></h1>
              <p className="text-sm text-text-muted mt-0.5">Here&apos;s your development activity overview</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">Last updated: {lastUpdated}</span>
              <button onClick={loadData} className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-card border border-border text-text-muted hover:text-text-primary transition-all" title="Refresh data">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {stats && <StatsCards stats={stats} />}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityFeed items={activityFeed} />
            <ActiveProjects projects={projects} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ContributionHeatmap contributions={contributions} />
            <WeeklyOverview data={weeklyActivity} />
            <TopLanguages languages={languages} />
          </div>
          <TopRepositories repos={topRepos} />
          <div className="flex items-center justify-between py-4 border-t border-border">
            <p className="text-xs text-text-muted">Project Activity Wall — Powered by GitHub API</p>
            <a href="https://github.com/wasteofwifi/project-activity" target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Source Code</a>
          </div>
        </div>
      </div>
    </div>
  )
}
