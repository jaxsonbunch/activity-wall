export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
  pushed_at: string
  size: number
  html_url: string
}

export interface GitHubEvent {
  id: string
  type: string
  actor: { login: string; avatar_url: string }
  repo: { name: string }
  payload: {
    commits?: Array<{ message: string; sha: string }>
    ref?: string
    ref_type?: string
    size?: number
    distinct_size?: number
  }
  created_at: string
}

export interface LanguageStat {
  name: string
  count: number
  color: string
}

export interface WeeklyActivity {
  day: string
  commits: number
  additions: number
  deletions: number
}

export interface ContributionDay {
  date: string
  count: number
  level: number
}

export interface ProjectActivity {
  name: string
  commits: number
  additions: number
  deletions: number
  progress: number
  lastActivity: string
}

export interface ActivityFeedItem {
  id: string
  type: 'commit' | 'push' | 'create' | 'pull_request' | 'star' | 'fork' | 'issue'
  message: string
  repo: string
  timestamp: string
  avatar: string
  details?: string
}

export interface DashboardStats {
  totalCommits: number
  totalProjects: number
  activeDays: number
  linesAdded: number
  linesDeleted: number
}
