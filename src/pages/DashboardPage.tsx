import { useState, useEffect, useMemo, useRef } from 'react'
import {
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  ListTree,
  FolderKanban,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Code2,
  GitMerge,
  Layers,
  FilePlus2,
  CircleAlert,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  LogOut,
  Star,
  GitFork,
} from 'lucide-react'
import { fetchDashboardData } from '../services/github'
import type {
  GitHubUser,
  DashboardStats,
  LanguageStat,
  ContributionDay,
  ProjectActivity,
  ActivityFeedItem,
  GitHubRepo,
} from '../types/github'

interface DashboardPageProps {
  username: string
  onLogout: () => void
}

const COLOR = {
  pageBg: '#1b1b1e',
  cardBg: '#242428',
  cardBgAlt: '#2a2a2f',
  border: '#34343a',
  borderSoft: '#2f2f35',
  textPrimary: '#f4f4f5',
  textSecondary: '#b6b6bd',
  textMuted: '#85858d',
  accent: '#e63946',
  accentHover: '#d62839',
  accentSoft: 'rgba(230,57,70,0.14)',
}

type Section = 'overview' | 'timeline' | 'projects' | 'calendar'
type TimeRange = 'weekly' | 'monthly' | 'all'

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: ListTree },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

const RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'weekly', label: 'This week' },
  { id: 'monthly', label: 'This month' },
  { id: 'all', label: 'All time' },
]

const RANGE_DAYS: Record<TimeRange, number | null> = {
  weekly: 7,
  monthly: 30,
  all: null,
}

const ACTIVITY_ICONS: Record<ActivityFeedItem['type'], typeof Code2> = {
  commit: Code2,
  push: Code2,
  create: FilePlus2,
  pull_request: GitMerge,
  star: Layers,
  fork: Layers,
  issue: CircleAlert,
}

const TAG_BY_LANGUAGE: Record<string, string> = {
  TypeScript: 'Frontend',
  JavaScript: 'Frontend',
  CSS: 'Design',
  HTML: 'Design',
  Python: 'Backend',
  Go: 'Backend',
  Rust: 'Tooling',
  Shell: 'Tooling',
}

const BADGE_PALETTE = [
  { bg: 'rgba(59,130,246,0.16)', text: '#60a5fa' },
  { bg: 'rgba(168,85,247,0.18)', text: '#c084fc' },
  { bg: 'rgba(230,57,70,0.18)', text: '#f87171' },
  { bg: 'rgba(230,57,70,0.18)', text: '#f87171' },
  { bg: 'rgba(230,57,70,0.18)', text: '#f87171' },
  { bg: 'rgba(34,197,94,0.16)', text: '#4ade80' },
]

function badgeStyle(index: number) {
  return BADGE_PALETTE[index % BADGE_PALETTE.length]
}

function initialsOf(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return name.slice(0, 1).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function isWithinRange(iso: string, range: TimeRange): boolean {
  const days = RANGE_DAYS[range]
  if (days === null) return true
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(iso).getTime() >= cutoff
}

function isWithinPriorRange(iso: string, range: TimeRange): boolean {
  const days = RANGE_DAYS[range]
  if (days === null) return false
  const now = Date.now()
  const periodMs = days * 24 * 60 * 60 * 1000
  const time = new Date(iso).getTime()
  return time >= now - periodMs * 2 && time < now - periodMs
}

function buildDailySeries(timestamps: string[], range: TimeRange): number[] {
  const days = range === 'monthly' ? 30 : 7
  const buckets = new Array(days).fill(0)
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  for (const iso of timestamps) {
    const time = new Date(iso).getTime()
    const dayIndex = days - 1 - Math.floor((now - time) / dayMs)
    if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += 1
  }
  return buckets
}

function percentChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null
  return Math.round(((current - prior) / prior) * 100)
}

function parseLineDelta(details: string | undefined): number | null {
  if (!details) return null
  const matches = details.match(/[+\-]\s?\d+/g)
  if (!matches) return null
  const total = matches.reduce((sum, token) => sum + parseInt(token.replace(/\s/g, ''), 10), 0)
  return Number.isNaN(total) ? null : Math.abs(total)
}

function describeFeedTag(item: ActivityFeedItem, repos: GitHubRepo[]): string {
  const repo = repos.find((r) => r.full_name === item.repo || r.name === item.repo)
  if (repo?.language && TAG_BY_LANGUAGE[repo.language]) return TAG_BY_LANGUAGE[repo.language]
  if (item.type === 'pull_request') return 'Review'
  if (item.type === 'issue') return 'Enhancement'
  if (item.type === 'star' || item.type === 'fork') return 'Community'
  return 'General'
}

function tagClasses(tag: string): string {
  switch (tag) {
    case 'Frontend':
      return 'bg-rose-500/15 text-rose-300'
    case 'Design':
      return 'bg-purple-500/15 text-purple-300'
    case 'Backend':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'Tooling':
      return 'bg-amber-500/15 text-amber-300'
    case 'Enhancement':
      return 'bg-sky-500/15 text-sky-300'
    default:
      return 'text-[#85858d]'
  }
}

function TrendChart({ points, direction }: { points: number[]; direction: 'up' | 'down' | 'flat' }) {
  const width = 120
  const height = 28
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const step = width / Math.max(points.length - 1, 1)
  const path = points
    .map((value, i) => {
      const x = i * step
      const y = height - ((value - min) / range) * (height - 6) - 3
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lineColor = direction === 'up' ? '#4ade80' : direction === 'down' ? '#f87171' : COLOR.textMuted
  const fillId = `trend-fill-${direction}`
  const last = points[points.length - 1] ?? 0
  const lastX = (points.length - 1) * step
  const lastY = height - ((last - min) / range) * (height - 6) - 3
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${fillId})`} stroke="none" />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={lineColor} />
    </svg>
  )
}

function ChangeBadge({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.14)' }}>
        New
      </span>
    )
  }
  if (percent === 0) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: COLOR.textMuted, backgroundColor: COLOR.cardBgAlt }}>
        No change
      </span>
    )
  }
  const positive = percent > 0
  const Icon = positive ? ArrowUp : ArrowDown
  const color = positive ? '#4ade80' : '#f87171'
  const bg = positive ? 'rgba(74,222,128,0.14)' : 'rgba(248,113,113,0.14)'
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color, backgroundColor: bg }}>
      <Icon className="w-3 h-3" />
      {Math.abs(percent)}%
    </span>
  )
}

function StatCard({
  label,
  value,
  isPerfect,
  trend,
  changePercent,
  showTrend,
}: {
  label: string
  value: string
  isPerfect?: boolean
  trend: number[]
  changePercent: number | null
  showTrend: boolean
}) {
  const direction: 'up' | 'down' | 'flat' =
    changePercent === null || changePercent === 0 ? 'flat' : changePercent > 0 ? 'up' : 'down'
  return (
    <div
      className="rounded-2xl px-4 py-3.5 backdrop-blur-xl"
      style={{
        backgroundColor: 'rgba(36, 36, 40, 0.65)',
        border: `1px solid rgba(52, 52, 58, 0.8)`,
      }}
    >
      <span className="text-[13px]" style={{ color: COLOR.textMuted }}>{label}</span>
      <div className="flex items-baseline justify-between mt-1.5">
        <span className="text-2xl leading-none font-bold" style={{ color: COLOR.textPrimary }}>{value}</span>
        {isPerfect ? (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: COLOR.accent }}>
            Perfect!
          </span>
        ) : showTrend ? (
          <ChangeBadge percent={changePercent} />
        ) : null}
      </div>
      {showTrend && (
        <div className="mt-2.5">
          <TrendChart points={trend} direction={direction} />
        </div>
      )}
    </div>
  )
}

function Donut({ languages, size = 112 }: { languages: LanguageStat[]; size?: number }) {
  const total = languages.reduce((sum, l) => sum + l.count, 0) || 1
  const radius = size * 0.36
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const center = size / 2
  const strokeWidth = size * 0.16
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#34343a" strokeWidth={strokeWidth} />
      {languages.map((lang) => {
        const fraction = lang.count / total
        const dash = fraction * circumference
        const gap = circumference - dash
        const el = (
          <circle
            key={lang.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={lang.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' })
}

function levelColor(level: number): string {
  switch (level) {
    case 0:
      return '#2c2c31'
    case 1:
      return '#5c2027'
    case 2:
      return '#8c2935'
    case 3:
      return '#c43545'
    default:
      return '#f0414f'
  }
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 backdrop-blur-xl"
      style={{
        backgroundColor: 'rgba(36, 36, 40, 0.65)',
        border: `1px solid rgba(52, 52, 58, 0.8)`,
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[15px] font-semibold" style={{ color: COLOR.textPrimary }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function RangeDropdown({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const current = RANGE_OPTIONS.find((option) => option.id === value) ?? RANGE_OPTIONS[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-[13px] font-medium rounded-xl px-3 py-1.5 backdrop-blur-xl transition-colors"
        style={{
          color: COLOR.textSecondary,
          backgroundColor: open ? COLOR.cardBg : 'rgba(36, 36, 40, 0.65)',
          border: `1px solid rgba(52, 52, 58, 0.8)`,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = COLOR.cardBg
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = 'rgba(36, 36, 40, 0.65)'
        }}
      >
        {current.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="animate-drop-in absolute left-0 top-full mt-1.5 w-36 rounded-xl p-1 z-20 shadow-xl"
          style={{ backgroundColor: COLOR.pageBg, border: `1px solid ${COLOR.border}` }}
        >
          {RANGE_OPTIONS.map((option) => {
            const active = option.id === value
            return (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className="w-full text-left text-[13px] rounded-lg px-2.5 py-1.5 transition-colors"
                style={{
                  color: active ? COLOR.accent : COLOR.textSecondary,
                  backgroundColor: active ? COLOR.accentSoft : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = COLOR.cardBg
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage({ username, onLogout }: DashboardPageProps) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [languages, setLanguages] = useState<LanguageStat[]>([])
  const [contributions, setContributions] = useState<ContributionDay[]>([])
  const [projects, setProjects] = useState<ProjectActivity[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([])
  const [topRepos, setTopRepos] = useState<GitHubRepo[]>([])
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [displaySection, setDisplaySection] = useState<Section>('overview')
  const [phase, setPhase] = useState<'entering' | 'settled' | 'leaving'>('entering')
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const contentRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchDashboardData(username)
      setUser(data.user)
      setStats(data.stats)
      setLanguages(data.languages)
      setContributions(data.contributions)
      setProjects(data.projects)
      setActivityFeed(data.activityFeed)
      setTopRepos(data.topRepos)
      setRepos(data.repos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [username])

  useEffect(() => {
    if (!loading && !error) {
      setPhase('entering')
      const frame = requestAnimationFrame(() => setPhase('settled'))
      return () => cancelAnimationFrame(frame)
    }
  }, [loading, error])

  const lastTimeRangeRef = useRef(timeRange)

  useEffect(() => {
    const sectionChanged = activeSection !== displaySection
    const rangeChanged = timeRange !== lastTimeRangeRef.current
    if (!sectionChanged && !rangeChanged) return
    setPhase('leaving')
    const timeout = setTimeout(() => {
      setDisplaySection(activeSection)
      lastTimeRangeRef.current = timeRange
      setPhase('entering')
      requestAnimationFrame(() => setPhase('settled'))
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 180)
    return () => clearTimeout(timeout)
  }, [activeSection, displaySection, timeRange])

  const heatmapWeeks = useMemo(() => {
    const weeks: ContributionDay[][] = []
    for (let i = 0; i < contributions.length; i += 7) weeks.push(contributions.slice(i, i + 7))
    return weeks
  }, [contributions])

  const heatmapMonthMarks = useMemo(() => {
    if (contributions.length === 0) return []
    const first = new Date(contributions[0].date)
    const last = new Date(contributions[contributions.length - 1].date)
    const mid = new Date(contributions[Math.floor(contributions.length / 2)].date)
    return [monthLabel(first), monthLabel(mid), monthLabel(last)]
  }, [contributions])

  const busiestDay = useMemo(() => {
    if (contributions.length === 0) return null
    return contributions.reduce((best, day) => (day.count > best.count ? day : best), contributions[0])
  }, [contributions])

  const rangedFeed = useMemo(
    () => activityFeed.filter((item) => isWithinRange(item.timestamp, timeRange)),
    [activityFeed, timeRange],
  )

  const rangedProjects = useMemo(() => {
    if (timeRange === 'all') return projects
    const activeNames = new Set(rangedFeed.map((item) => item.repo))
    const filtered = projects.filter((project) => activeNames.has(project.name))
    return filtered.length > 0 ? filtered : projects
  }, [projects, rangedFeed, timeRange])

  const rangedTopRepos = useMemo(() => {
    if (timeRange === 'all') return topRepos
    const activeNames = new Set(rangedFeed.map((item) => item.repo))
    const filtered = topRepos.filter((repo) => activeNames.has(repo.full_name) || activeNames.has(repo.name))
    return filtered.length > 0 ? filtered : topRepos
  }, [topRepos, rangedFeed, timeRange])

  const priorRangedFeed = useMemo(
    () => activityFeed.filter((item) => isWithinPriorRange(item.timestamp, timeRange)),
    [activityFeed, timeRange],
  )

  const isCommitLike = (item: ActivityFeedItem) => item.type === 'commit' || item.type === 'push'

  const rangedCommitCount = useMemo(
    () => (timeRange === 'all' ? stats?.totalCommits ?? 0 : rangedFeed.filter(isCommitLike).length),
    [rangedFeed, timeRange, stats],
  )

  const priorCommitCount = useMemo(() => priorRangedFeed.filter(isCommitLike).length, [priorRangedFeed])

  const commitChangePercent = useMemo(
    () => (timeRange === 'all' ? null : percentChange(rangedCommitCount, priorCommitCount)),
    [rangedCommitCount, priorCommitCount, timeRange],
  )

  const commitSeries = useMemo(
    () => buildDailySeries(rangedFeed.filter(isCommitLike).map((item) => item.timestamp), timeRange),
    [rangedFeed, timeRange],
  )

  const rangedActiveProjectCount = useMemo(
    () => new Set(rangedFeed.map((item) => item.repo)).size,
    [rangedFeed],
  )

  const priorActiveProjectCount = useMemo(
    () => new Set(priorRangedFeed.map((item) => item.repo)).size,
    [priorRangedFeed],
  )

  const projectChangePercent = useMemo(
    () => (timeRange === 'all' ? null : percentChange(rangedActiveProjectCount, priorActiveProjectCount)),
    [rangedActiveProjectCount, priorActiveProjectCount, timeRange],
  )

  const projectSeries = useMemo(() => {
    const days = timeRange === 'monthly' ? 30 : 7
    const seen = new Array(days).fill(null).map(() => new Set<string>())
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    for (const item of rangedFeed) {
      const dayIndex = days - 1 - Math.floor((now - new Date(item.timestamp).getTime()) / dayMs)
      if (dayIndex >= 0 && dayIndex < days) seen[dayIndex].add(item.repo)
    }
    return seen.map((set) => set.size)
  }, [rangedFeed, timeRange])

  const rangedActiveDayCount = useMemo(() => {
    const days = new Set(rangedFeed.map((item) => new Date(item.timestamp).toDateString()))
    return days.size
  }, [rangedFeed])

  const priorActiveDayCount = useMemo(() => {
    const days = new Set(priorRangedFeed.map((item) => new Date(item.timestamp).toDateString()))
    return days.size
  }, [priorRangedFeed])

  const activeDayChangePercent = useMemo(
    () => (timeRange === 'all' ? null : percentChange(rangedActiveDayCount, priorActiveDayCount)),
    [rangedActiveDayCount, priorActiveDayCount, timeRange],
  )

  const activeDaySeries = useMemo(() => {
    const days = timeRange === 'monthly' ? 30 : 7
    const buckets = new Array(days).fill(0)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    for (const item of rangedFeed) {
      const dayIndex = days - 1 - Math.floor((now - new Date(item.timestamp).getTime()) / dayMs)
      if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] = 1
    }
    return buckets
  }, [rangedFeed, timeRange])

  const rangedLineDeltas = useMemo(
    () => rangedFeed.filter(isCommitLike).map((item) => parseLineDelta(item.details)),
    [rangedFeed],
  )

  const hasLineData = useMemo(() => rangedLineDeltas.some((delta) => delta !== null), [rangedLineDeltas])

  const rangedLinesChanged = useMemo(() => {
    if (timeRange === 'all') return (stats?.linesAdded ?? 0) + (stats?.linesDeleted ?? 0)
    return rangedLineDeltas.reduce<number>((sum, delta) => sum + (delta ?? 0), 0)
  }, [timeRange, stats, rangedLineDeltas])

  const priorLinesChanged = useMemo(
    () =>
      priorRangedFeed
        .filter(isCommitLike)
        .map((item) => parseLineDelta(item.details))
        .reduce<number>((sum, delta) => sum + (delta ?? 0), 0),
    [priorRangedFeed],
  )

  const lineChangePercent = useMemo(
    () => (timeRange === 'all' || !hasLineData ? null : percentChange(rangedLinesChanged, priorLinesChanged)),
    [rangedLinesChanged, priorLinesChanged, timeRange, hasLineData],
  )

  const lineSeries = useMemo(() => {
    const days = timeRange === 'monthly' ? 30 : 7
    const buckets = new Array(days).fill(0)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    for (const item of rangedFeed.filter(isCommitLike)) {
      const delta = parseLineDelta(item.details)
      if (delta === null) continue
      const dayIndex = days - 1 - Math.floor((now - new Date(item.timestamp).getTime()) / dayMs)
      if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += delta
    }
    return buckets
  }, [rangedFeed, timeRange])

  const rangeNoun = timeRange === 'weekly' ? "this week's" : timeRange === 'monthly' ? "this month's" : 'all-time'
  const overviewSubtitle = `Your coding activity, ${timeRange === 'all' ? 'all in one place' : `over ${rangeNoun.replace("'s", '')}`}.`

  const motionClass =
    phase === 'leaving' ? 'animate-fall-out' : phase === 'entering' ? 'opacity-0' : 'animate-rise-in'

  function staggerStyle(delayMs: number) {
    return phase === 'settled' ? { animationDelay: `${delayMs}ms` } : undefined
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLOR.pageBg }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: `${COLOR.accent}33`, borderTopColor: COLOR.accent }} />
          <p className="text-sm" style={{ color: COLOR.textMuted }}>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLOR.pageBg }}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <AlertCircle className="w-12 h-12" style={{ color: COLOR.accent }} />
          <p className="text-lg font-semibold" style={{ color: COLOR.textPrimary }}>Failed to load data</p>
          <p className="text-sm" style={{ color: COLOR.textMuted }}>{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white font-medium"
            style={{ backgroundColor: COLOR.accent }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#17171a' }}>
      <aside
        className="w-[210px] shrink-0 flex flex-col rounded-3xl shadow-2xl mt-3 ml-3 mb-3 overflow-hidden"
        style={{
          backgroundColor: COLOR.pageBg,
          border: `1px solid #3a3a42`,
        }}
      >
        <div className="px-5 pt-6 pb-6 flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-6 h-6 rounded" />
          <span className="font-bold text-[15px] tracking-tight" style={{ color: COLOR.textPrimary }}>Activity Wall</span>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: '#3a1419', color: COLOR.accent }
                    : { color: COLOR.textMuted, backgroundColor: 'transparent' }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = COLOR.cardBg
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Icon className="w-[17px] h-[17px]" />
                {label}
              </button>
            )
          })}
        </nav>
        <div className="mx-3 mb-5 flex items-center gap-3 px-2 py-2">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={username} className="w-9 h-9 rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full" style={{ backgroundColor: COLOR.cardBg }} />
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13.5px] font-semibold truncate" style={{ color: COLOR.textPrimary }}>{username}</span>
            <span className="text-[11px] truncate" style={{ color: COLOR.textMuted }}>{user?.name || 'GitHub member'}</span>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg shrink-0 transition-all"
            style={{ color: COLOR.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLOR.accent
              e.currentTarget.style.backgroundColor = COLOR.cardBg
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLOR.textMuted
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="relative z-30 px-7 pt-6 pb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${motionClass}`} style={{ color: COLOR.textPrimary }}>
                Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[13px] ${motionClass}`} style={{ color: COLOR.textMuted }}>
                  {displaySection === 'overview' && overviewSubtitle}
                  {displaySection === 'timeline' && `Every public event, ${rangeNoun}, newest first.`}
                  {displaySection === 'projects' && `Repositories with activity ${timeRange === 'all' ? '' : rangeNoun}.`.trim()}
                  {displaySection === 'calendar' && 'Past month of contribution history.'}
                </p>
                {displaySection !== 'calendar' && <RangeDropdown value={timeRange} onChange={setTimeRange} />}
              </div>
            </div>
          </div>
          <div className="px-7 pb-8">
            {displaySection === 'overview' && (
              <div className={`space-y-5 ${motionClass}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={staggerStyle(0)}>
                  {stats && (
                    <>
                      <StatCard
                        label="Commits"
                        value={formatNumber(rangedCommitCount)}
                        trend={commitSeries}
                        changePercent={commitChangePercent}
                        showTrend={timeRange !== 'all'}
                      />
                      <StatCard
                        label="Projects"
                        value={formatNumber(rangedActiveProjectCount)}
                        trend={projectSeries}
                        changePercent={projectChangePercent}
                        showTrend={timeRange !== 'all'}
                      />
                      <StatCard
                        label="Active Days"
                        value={formatNumber(rangedActiveDayCount)}
                        isPerfect={timeRange === 'weekly' && rangedActiveDayCount >= 7}
                        trend={activeDaySeries}
                        changePercent={activeDayChangePercent}
                        showTrend={timeRange !== 'all'}
                      />
                      <StatCard
                        label="Lines Changed"
                        value={timeRange !== 'all' && !hasLineData ? '—' : formatNumber(rangedLinesChanged)}
                        trend={lineSeries}
                        changePercent={lineChangePercent}
                        showTrend={timeRange !== 'all' && hasLineData}
                      />
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5" style={staggerStyle(70)}>
                  <SectionCard title="Activity Feed">
                    {rangedFeed.length === 0 ? (
                      <p className="text-sm py-5 text-center" style={{ color: COLOR.textMuted }}>
                        Nothing here yet. Activity shows up once {username} pushes, opens, or merges something public.
                      </p>
                    ) : (
                      <ul>
                        {rangedFeed.slice(0, 4).map((item, idx) => {
                          const Icon = ACTIVITY_ICONS[item.type]
                          const isLast = idx === Math.min(rangedFeed.length, 4) - 1
                          const tag = describeFeedTag(item, repos)
                          return (
                            <li key={item.id} className="flex gap-3">
                              <div className="flex flex-col items-end w-14 shrink-0 pt-3">
                                <span className="text-[11px] whitespace-nowrap" style={{ color: COLOR.textMuted }}>{timeLabel(item.timestamp)}</span>
                              </div>
                              <div className="flex flex-col items-center shrink-0">
                                <span className="w-2 h-2 rounded-full mt-[18px]" style={{ backgroundColor: COLOR.accent }} />
                                {!isLast && <span className="w-px flex-1 my-1" style={{ backgroundColor: `${COLOR.accent}4d` }} />}
                              </div>
                              <div
                                className="flex-1 flex items-center gap-2.5 py-2.5"
                                style={!isLast ? { borderBottom: `1px solid ${COLOR.borderSoft}` } : undefined}
                              >
                                <span
                                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: COLOR.cardBgAlt, color: COLOR.accent }}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] leading-snug" style={{ color: COLOR.textPrimary }}>{item.message}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.details && (
                                      <span className="text-[11px] truncate" style={{ color: COLOR.textMuted }}>{item.details}</span>
                                    )}
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${tagClasses(tag)}`}>{tag}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: COLOR.textMuted }} />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {rangedFeed.length > 0 && (
                      <div className="flex justify-center mt-3">
                        <button
                          onClick={() => setActiveSection('timeline')}
                          className="text-[13px] font-medium rounded-full px-4 py-1.5 flex items-center gap-1.5 transition-all"
                          style={{ color: COLOR.accent, backgroundColor: COLOR.accentSoft }}
                        >
                          View full timeline
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </SectionCard>
                  <div className="space-y-5">
                    <SectionCard title="Active Projects">
                      {rangedProjects.length === 0 ? (
                        <p className="text-sm py-3 text-center" style={{ color: COLOR.textMuted }}>No repositories with recent pushes.</p>
                      ) : (
                        <ul className="space-y-3">
                          {rangedProjects.map((project, idx) => {
                            const palette = badgeStyle(idx)
                            return (
                              <li key={project.name} className="flex items-center gap-2.5">
                                <span
                                  className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: palette.bg, color: palette.text }}
                                >
                                  {initialsOf(project.name)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[13px] truncate" style={{ color: COLOR.textPrimary }}>{project.name}</span>
                                    <span className="text-[11px] shrink-0" style={{ color: COLOR.textMuted }}>{project.progress}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLOR.cardBgAlt }}>
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: phase === 'settled' ? `${project.progress}%` : '0%', backgroundColor: COLOR.accent }}
                                    />
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </SectionCard>
                    <SectionCard title="Contribution Heatmap">
                      {contributions.length === 0 ? (
                        <p className="text-sm py-3 text-center" style={{ color: COLOR.textMuted }}>No contribution data available.</p>
                      ) : (
                        <>
                          <div className="flex gap-2.5">
                            <div className="flex flex-col justify-between text-[10px] py-0.5" style={{ color: COLOR.textMuted }}>
                              <span>Mon</span>
                              <span>Wed</span>
                              <span>Fri</span>
                            </div>
                            <div className="flex gap-[3px] flex-1 justify-between">
                              {heatmapWeeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col gap-[3px]">
                                  {week.map((day) => (
                                    <span
                                      key={day.date}
                                      title={`${day.date}: ${day.count} event${day.count === 1 ? '' : 's'}`}
                                      className="w-[9px] h-[9px] rounded-[2px]"
                                      style={{ backgroundColor: levelColor(day.level) }}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] mt-1.5 pl-6" style={{ color: COLOR.textMuted }}>
                            {heatmapMonthMarks.map((m, i) => (
                              <span key={i}>{m}</span>
                            ))}
                          </div>
                          {busiestDay && busiestDay.count > 0 && (
                            <p className="text-[11px] mt-2.5" style={{ color: COLOR.textMuted }}>
                              More activity on{' '}
                              <span className="font-medium" style={{ color: COLOR.textPrimary }}>
                                {new Date(busiestDay.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                            </p>
                          )}
                        </>
                      )}
                    </SectionCard>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={staggerStyle(140)}>
                  <SectionCard title="Top Languages">
                    {languages.length === 0 ? (
                      <p className="text-sm py-3 text-center" style={{ color: COLOR.textMuted }}>No language data yet.</p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <Donut languages={languages} size={96} />
                        <ul className="flex-1 space-y-1.5 min-w-0">
                          {languages.map((lang) => {
                            const total = languages.reduce((s, l) => s + l.count, 0) || 1
                            const pct = Math.round((lang.count / total) * 100)
                            return (
                              <li key={lang.name} className="flex items-center justify-between text-[12.5px] gap-2">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
                                  <span className="truncate" style={{ color: COLOR.textSecondary }}>{lang.name}</span>
                                </span>
                                <span className="shrink-0" style={{ color: COLOR.textMuted }}>{pct}%</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </SectionCard>
                  <SectionCard title="Top Repositories">
                    {rangedTopRepos.length === 0 ? (
                      <p className="text-sm py-3 text-center" style={{ color: COLOR.textMuted }}>No public repositories found.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {rangedTopRepos.slice(0, 3).map((repo, idx) => {
                          const repoCommits = projects.find((p) => p.name === repo.name)?.commits ?? 0
                          const palette = badgeStyle(idx)
                          return (
                            <li key={repo.id}>
                              <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 group">
                                <span
                                  className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: palette.bg, color: palette.text }}
                                >
                                  {initialsOf(repo.name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[13px] truncate group-hover:underline" style={{ color: COLOR.textPrimary }}>{repo.name}</p>
                                  <p className="text-[11px]" style={{ color: COLOR.textMuted }}>{formatNumber(repoCommits)} commits</p>
                                </div>
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
            )}
            {displaySection === 'timeline' && (
              <div className={motionClass}>
                <SectionCard title={`Timeline — ${RANGE_OPTIONS.find((o) => o.id === timeRange)?.label}`}>
                  {rangedFeed.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: COLOR.textMuted }}>No public activity found for {username} in this range.</p>
                  ) : (
                    <ul>
                      {rangedFeed.map((item, idx) => {
                        const Icon = ACTIVITY_ICONS[item.type]
                        const isLast = idx === rangedFeed.length - 1
                        const tag = describeFeedTag(item, repos)
                        return (
                          <li key={item.id} className="flex gap-3">
                            <div className="flex flex-col items-end w-24 shrink-0 pt-3">
                              <span className="text-[11px] whitespace-nowrap" style={{ color: COLOR.textMuted }}>{dateLabel(item.timestamp)}</span>
                              <span className="text-[11px] whitespace-nowrap" style={{ color: COLOR.textMuted }}>{timeLabel(item.timestamp)}</span>
                            </div>
                            <div className="flex flex-col items-center shrink-0">
                              <span className="w-2 h-2 rounded-full mt-[18px]" style={{ backgroundColor: COLOR.accent }} />
                              {!isLast && <span className="w-px flex-1 my-1" style={{ backgroundColor: `${COLOR.accent}4d` }} />}
                            </div>
                            <div
                              className="flex-1 flex items-center gap-2.5 py-2.5"
                              style={!isLast ? { borderBottom: `1px solid ${COLOR.borderSoft}` } : undefined}
                            >
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: COLOR.cardBgAlt, color: COLOR.accent }}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] leading-snug" style={{ color: COLOR.textPrimary }}>{item.message}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.details && <span className="text-[11px] truncate" style={{ color: COLOR.textMuted }}>{item.details}</span>}
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${tagClasses(tag)}`}>{tag}</span>
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </SectionCard>
              </div>
            )}
            {displaySection === 'projects' && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${motionClass}`}>
                {repos.length === 0 ? (
                  <p className="text-sm py-6 text-center col-span-full" style={{ color: COLOR.textMuted }}>No public repositories found.</p>
                ) : (
                  repos.slice(0, 12).map((repo, idx) => {
                    const palette = badgeStyle(idx)
                    const projectMatch = projects.find((p) => p.name === repo.name)
                    return (
                      <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5 backdrop-blur-xl"
                        style={{
                          backgroundColor: 'rgba(36, 36, 40, 0.65)',
                          border: `1px solid rgba(52, 52, 58, 0.8)`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-8 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: palette.bg, color: palette.text }}
                          >
                            {initialsOf(repo.name)}
                          </span>
                          <span className="text-[13.5px] font-semibold truncate" style={{ color: COLOR.textPrimary }}>{repo.name}</span>
                        </div>
                        <p className="text-[12px] leading-snug line-clamp-2" style={{ color: COLOR.textMuted, minHeight: '2.2em' }}>
                          {repo.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: COLOR.textMuted }}>
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e63946' }} />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {repo.forks_count}
                          </span>
                        </div>
                        {projectMatch && (
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLOR.cardBgAlt }}>
                            <div className="h-full rounded-full" style={{ width: `${projectMatch.progress}%`, backgroundColor: COLOR.accent }} />
                          </div>
                        )}
                      </a>
                    )
                  })
                )}
              </div>
            )}
            {displaySection === 'calendar' && (
              <div className={motionClass}>
                <SectionCard title="Contribution Calendar (Past Month)">
                  {contributions.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: COLOR.textMuted }}>No contribution data available.</p>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {contributions.map((day) => (
                        <div
                          key={day.date}
                          className="rounded-xl p-2.5 flex flex-col gap-1.5 backdrop-blur-xl"
                          style={{
                            backgroundColor: 'rgba(42, 42, 47, 0.75)',
                            border: `1px solid rgba(52, 52, 58, 0.8)`,
                          }}
                        >
                          <span className="text-[10px]" style={{ color: COLOR.textMuted }}>
                            {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="w-full h-2 rounded-full" style={{ backgroundColor: levelColor(day.level) }} />
                          <span className="text-[11px] font-medium" style={{ color: COLOR.textPrimary }}>
                            {day.count} event{day.count === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
