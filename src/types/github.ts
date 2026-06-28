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
  created_at: string
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
  commitCount?: number
}
export interface DashboardStats {
  totalCommits: number
  totalProjects: number
  activeDays: number
  linesAdded: number
  linesDeleted: number
}
export interface AssignedIssue {
  id: number
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  comments: number
  created_at: string
  updated_at: string
  closed_at: string | null
  labels: { name: string; color: string }[]
  repository: {
    name: string
    full_name: string
    html_url: string
  }
 
  pull_request?: unknown
}
export interface PullRequestTotals {
  opened: number
  merged: number
  closedWithoutMerge: number
}
