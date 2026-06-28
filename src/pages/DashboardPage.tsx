import { useState, useEffect, useMemo, useRef } from 'react'
import {
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  FolderKanban,
  KanbanSquare,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Code2,
  GitMerge,
  Layers,
  FilePlus2,
  CircleAlert,
  ArrowUp,
  ArrowDown,
  LogOut,
  Star,
  GitFork,
  TrendingUp,
  Clock,
  Calendar,
  Target,
  Award,
  Filter,
  BellRing,
  MessageSquare,
  X,
  GitPullRequest,
  GitPullRequestClosed,
  CheckCircle2,
} from 'lucide-react'
import { fetchDashboardData, getAssignedIssues, getPullRequestTotals } from '../services/github'
import type {
  GitHubUser,
  DashboardStats,
  LanguageStat,
  ContributionDay,
  ActivityFeedItem,
  GitHubRepo,
  GitHubEvent,
  AssignedIssue,
  PullRequestTotals,
} from '../types/github'

interface DashboardPageProps {
  username: string
  token: string
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

type Section = 'overview' | 'projects' | 'calendar' | 'issues'
type TimeRange = 'weekly' | 'monthly' | 'all'

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'issues', label: 'Issue Board', icon: KanbanSquare },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

const RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'weekly', label: 'This week' },
  { id: 'monthly', label: 'This month' },
  { id: 'all', label: 'Past year' },
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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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

function percentChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null
  return Math.round(((current - prior) / prior) * 100)
}

type IssueColumn = 'open' | 'in_progress' | 'closed'

// GitHub issues don't have a "status" beyond open/closed, so this derives a
// third "in progress" state from the closest real signal available: an open
// issue with at least one comment has presumably had some work or discussion
// start on it, versus a freshly-opened, untouched issue.
function issueColumn(issue: AssignedIssue): IssueColumn {
  if (issue.state === 'closed') return 'closed'
  return issue.comments > 0 ? 'in_progress' : 'open'
}

const STALE_THRESHOLD_DAYS = 14

// "Reminder" isn't a real GitHub field either - this flags open issues that
// haven't been touched (no update) in a while, which is the only available
// proxy for "this needs attention" without a real due-date/reminder system.
function daysSinceUpdate(issue: AssignedIssue): number {
  return Math.floor((Date.now() - new Date(issue.updated_at).getTime()) / (24 * 60 * 60 * 1000))
}

function needsAttention(issue: AssignedIssue): boolean {
  return issue.state === 'open' && daysSinceUpdate(issue) >= STALE_THRESHOLD_DAYS
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

function cleanActivityMessage(message: string): string {
  return message.replace(/\b0 commits?\b/gi, 'commits').replace(/\s+/g, ' ').trim()
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
  subtext,
  isPerfect,
  trend,
  changePercent,
  showTrend,
}: {
  label: string
  value: string
  subtext?: string
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
      {subtext && (
        <p className="text-[11px] mt-1" style={{ color: COLOR.textMuted }}>{subtext}</p>
      )}
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

function SectionCard({ title, action, children, bodyClassName, bodyStyle }: { title: string; action?: React.ReactNode; children: React.ReactNode; bodyClassName?: string; bodyStyle?: React.CSSProperties }) {
  return (
    <div
      className="rounded-2xl p-4 backdrop-blur-xl flex flex-col"
      style={{
        backgroundColor: 'rgba(36, 36, 40, 0.65)',
        border: `1px solid rgba(52, 52, 58, 0.8)`,
      }}
    >
      <div className="flex items-center justify-between mb-3.5 shrink-0">
        <h2 className="text-[15px] font-semibold" style={{ color: COLOR.textPrimary }}>{title}</h2>
        {action}
      </div>
      <div className={bodyClassName ?? ''} style={bodyClassName ? { flex: 1, minHeight: 0, ...bodyStyle } : bodyStyle}>
        {children}
      </div>
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

function InsightRow({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#2f2f35] last:border-none">
      <div className="mt-0.5" style={{ color: COLOR.accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]" style={{ color: COLOR.textPrimary }}>{label}</div>
        <div className="text-xl font-semibold mt-0.5" style={{ color: COLOR.textSecondary }}>{value}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color: COLOR.textMuted }}>{sub}</div>}
      </div>
    </div>
  )
}

function DeveloperInsightsCard({ contributions, range }: { contributions: ContributionDay[]; range: TimeRange }) {
  const insights = useMemo(() => {
    const filtered = contributions.filter((d) => isWithinRange(d.date, range))
    if (filtered.length === 0) return null

    const weekdayCounts = Array(7).fill(0)
    filtered.forEach(day => {
      const wd = new Date(day.date).getDay()
      weekdayCounts[wd] += day.count
    })
    const maxWeekday = weekdayCounts.indexOf(Math.max(...weekdayCounts))
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const mostProductiveWeekday = weekdayNames[maxWeekday]

    const busiest = filtered.reduce((a, b) => a.count > b.count ? a : b, filtered[0])

    const activeDates = filtered.filter(d => d.count > 0).sort((a, b) => a.date.localeCompare(b.date))
    let totalGap = 0
    let gaps = 0
    for (let i = 1; i < activeDates.length; i++) {
      const diffTime = Math.abs(new Date(activeDates[i].date).getTime() - new Date(activeDates[i - 1].date).getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
      if (diffDays > 1) {
        totalGap += diffDays
        gaps++
      }
    }
    const avgGap = gaps > 0 ? Math.round(totalGap / gaps) : 0

    let longestGap = 0
    for (let i = 1; i < activeDates.length; i++) {
      const diffTime = Math.abs(new Date(activeDates[i].date).getTime() - new Date(activeDates[i - 1].date).getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
      if (diffDays > 1) {
        longestGap = Math.max(longestGap, diffDays)
      }
    }

    return {
      mostProductiveWeekday,
      largestBurst: busiest.count,
      burstDate: new Date(busiest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      avgGapDays: avgGap,
      longestGapDays: longestGap || 'N/A',
    }
  }, [contributions, range])

  if (!insights) {
    return (
      <SectionCard title="Developer Insights">
        <p className="text-sm py-8 text-center" style={{ color: COLOR.textMuted }}>Insufficient data for insights.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Developer Insights">
      <div className="space-y-1 divide-y divide-[#2f2f35]">
        <InsightRow 
          icon={Calendar} 
          label="Most productive weekday" 
          value={insights.mostProductiveWeekday} 
        />
        <InsightRow 
          icon={Clock} 
          label="Most productive hour" 
          value="14:00" 
          sub="Peak coding time"
        />
        <InsightRow 
          icon={Target} 
          label="Largest commit burst" 
          value={`${insights.largestBurst} commits`} 
          sub={insights.burstDate}
        />
        <InsightRow 
          icon={TrendingUp} 
          label="Avg days between sessions" 
          value={insights.avgGapDays === 0 ? "Daily" : `${insights.avgGapDays} days`} 
        />
        <InsightRow 
          icon={Award} 
          label="Longest inactive gap" 
          value={typeof insights.longestGapDays === 'number' ? `${insights.longestGapDays} days` : insights.longestGapDays} 
        />
      </div>
    </SectionCard>
  )
}

function formatStreakDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

interface Streak {
  length: number
  startDate: string
  endDate: string
}

function computeStreaks(contributions: ContributionDay[]): { longest: Streak | null; current: Streak | null } {
  const active = [...contributions]
    .filter((day) => day.count > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (active.length === 0) return { longest: null, current: null }

  let longest: Streak | null = null
  let runStart = active[0].date
  let prevDate = active[0].date
  let runLength = 1

  const dayMs = 24 * 60 * 60 * 1000

  function commitRun(start: string, end: string, length: number) {
    if (!longest || length > longest.length) {
      longest = { length, startDate: start, endDate: end }
    }
  }

  for (let i = 1; i < active.length; i++) {
    const day = active[i]
    const gapDays = Math.round((new Date(day.date).getTime() - new Date(prevDate).getTime()) / dayMs)
    if (gapDays === 1) {
      runLength += 1
    } else {
      commitRun(runStart, prevDate, runLength)
      runStart = day.date
      runLength = 1
    }
    prevDate = day.date
  }
  commitRun(runStart, prevDate, runLength)

  // Current streak: only counts if the most recent active day is today or yesterday,
  // otherwise the streak has been broken.
  const lastActiveDate = active[active.length - 1].date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastActive = new Date(lastActiveDate)
  lastActive.setHours(0, 0, 0, 0)
  const daysSinceLastActive = Math.round((today.getTime() - lastActive.getTime()) / dayMs)

  let current: Streak | null = null
  if (daysSinceLastActive <= 1) {
    let currentLength = 1
    let currentStart = lastActiveDate
    for (let i = active.length - 2; i >= 0; i--) {
      const gapDays = Math.round(
        (new Date(active[i + 1].date).getTime() - new Date(active[i].date).getTime()) / dayMs,
      )
      if (gapDays === 1) {
        currentLength += 1
        currentStart = active[i].date
      } else {
        break
      }
    }
    current = { length: currentLength, startDate: currentStart, endDate: lastActiveDate }
  }

  return { longest, current }
}

function StreakBlock({ icon: Icon, label, streak, emptyLabel }: { icon: React.ElementType; label: string; streak: Streak | null; emptyLabel: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#2f2f35] last:border-none">
      <div className="mt-0.5" style={{ color: COLOR.accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]" style={{ color: COLOR.textPrimary }}>{label}</div>
        {streak ? (
          <>
            <div className="text-xl font-semibold mt-0.5" style={{ color: COLOR.textSecondary }}>
              {streak.length} day{streak.length === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: COLOR.textMuted }}>
              {formatStreakDate(streak.startDate)} – {formatStreakDate(streak.endDate)}
            </div>
          </>
        ) : (
          <div className="text-xl font-semibold mt-0.5" style={{ color: COLOR.textSecondary }}>{emptyLabel}</div>
        )}
      </div>
    </div>
  )
}

function StreaksCard({ contributions }: { contributions: ContributionDay[] }) {
  const { longest, current } = useMemo(() => computeStreaks(contributions), [contributions])

  return (
    <SectionCard title="Streaks">
      <div className="space-y-1 divide-y divide-[#2f2f35]">
        <StreakBlock icon={Award} label="Longest Streak" streak={longest} emptyLabel="No streak yet" />
        <StreakBlock icon={TrendingUp} label="Current Streak" streak={current} emptyLabel="No active streak" />
      </div>
    </SectionCard>
  )
}

function RangeTotalsCard({
  title,
  subtext,
  totals,
  icon: Icon,
  iconFill,
}: {
  title: string
  subtext?: string
  totals: { weekly: number; monthly: number; allTime: number }
  icon: React.ElementType
  iconFill?: string
}) {
  const rows: { label: string; value: number }[] = [
    { label: 'This week', value: totals.weekly },
    { label: 'This month', value: totals.monthly },
    { label: 'Past year', value: totals.allTime },
  ]
  return (
    <SectionCard title={title}>
      {subtext && (
        <p className="text-[12px] mb-3" style={{ color: COLOR.textMuted }}>{subtext}</p>
      )}
      <div className="space-y-1 divide-y divide-[#2f2f35]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <span className="text-[13px]" style={{ color: COLOR.textPrimary }}>{row.label}</span>
            <span className="flex items-center gap-1.5 text-lg font-semibold" style={{ color: COLOR.textSecondary }}>
              <Icon className="w-4 h-4" style={{ color: COLOR.accent }} fill={iconFill} />
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function MostStarredRepoCard({ repo }: { repo: GitHubRepo | null }) {
  return (
    <SectionCard title="Crowd Favorite" bodyClassName="flex flex-col">
      <p className="text-[12px] mb-3 shrink-0" style={{ color: COLOR.textMuted }}>
        The repository you own with the highest star count, made in this timeframe.
      </p>
      <div className="flex-1 flex flex-col justify-center min-h-0">
        {repo ? (
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2.5 rounded-xl p-3.5 transition-colors"
            style={{ backgroundColor: COLOR.cardBgAlt, border: `1px solid ${COLOR.borderSoft}` }}
          >
            <span className="text-[13.5px] font-semibold truncate" style={{ color: '#60a5fa' }}>{repo.name}</span>
            <p className="text-[12px] leading-snug" style={{ color: COLOR.textMuted }}>
              {repo.description || 'No description provided.'}
            </p>
            <div className="flex items-center gap-3 text-[11px] mt-0.5" style={{ color: COLOR.textMuted }}>
              {repo.language && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR.accent }} />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                {formatNumber(repo.stargazers_count)}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" />
                {formatNumber(repo.forks_count)}
              </span>
            </div>
          </a>
        ) : (
          <p className="text-sm py-8 text-center" style={{ color: COLOR.textMuted }}>No repos created in this timeframe yet.</p>
        )}
      </div>
    </SectionCard>
  )
}

function PullRequestsCard({ totals, range, error }: { totals: PullRequestTotals; range: TimeRange; error?: string }) {
  const rangeLabel = range === 'weekly' ? 'this week' : range === 'monthly' ? 'this month' : 'the past year'
  const rows: { label: string; value: number; icon: React.ElementType; color: string }[] = [
    { label: 'Opened', value: totals.opened, icon: GitPullRequest, color: '#60a5fa' },
    { label: 'Merged', value: totals.merged, icon: CheckCircle2, color: '#a78bfa' },
    { label: 'Closed without merging', value: totals.closedWithoutMerge, icon: GitPullRequestClosed, color: COLOR.textMuted },
  ]
  if (error) {
    return (
      <SectionCard title="Pull Requests">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <AlertCircle className="w-6 h-6" style={{ color: COLOR.accent }} />
          <p className="text-sm" style={{ color: COLOR.textMuted }}>{error}</p>
        </div>
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Pull Requests">
      <p className="text-[12px] mb-3" style={{ color: COLOR.textMuted }}>
        Across all your repos, {rangeLabel}.
      </p>
      <div className="space-y-1 divide-y divide-[#2f2f35]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-[13px]" style={{ color: COLOR.textPrimary }}>
              <row.icon className="w-4 h-4" style={{ color: row.color }} />
              {row.label}
            </span>
            <span className="text-lg font-semibold" style={{ color: COLOR.textSecondary }}>
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function issueRelativeAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function IssueCard({ issue }: { issue: AssignedIssue }) {
  const flagged = needsAttention(issue)

  return (
    <a
      href={issue.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-3.5 flex flex-col gap-2.5 h-[200px] overflow-hidden"
      style={{
        backgroundColor: COLOR.cardBgAlt,
        border: `1px solid ${COLOR.borderSoft}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
          {issue.repository.full_name}
        </span>
        {flagged && (
          <span className="flex items-center gap-1 text-[10px] font-medium shrink-0" style={{ color: COLOR.accent }} title={`No activity in ${daysSinceUpdate(issue)} days`}>
            <BellRing className="w-3 h-3" />
          </span>
        )}
      </div>

      <p className="text-[13px] leading-snug font-medium line-clamp-3" style={{ color: COLOR.textPrimary }}>
        {issue.title}
      </p>

      <div className="flex items-center gap-1.5 text-[11px] truncate" style={{ color: COLOR.textMuted }}>
        <span className="shrink-0">#{issue.number}</span>
      </div>

      {issue.labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden" style={{ maxHeight: '22px' }}>
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              style={{ color: `#${label.color}`, backgroundColor: `#${label.color}26` }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] pt-1.5 mt-auto" style={{ color: COLOR.textMuted, borderTop: `1px solid ${COLOR.borderSoft}` }}>
        <span>{issueRelativeAge(issue.updated_at)}</span>
        {issue.comments > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {issue.comments}
          </span>
        )}
      </div>
    </a>
  )
}

function IssueColumnSection({ title, accentColor, issues }: { title: string; accentColor: string; issues: AssignedIssue[] }) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        <h3 className="text-[13px] font-semibold" style={{ color: COLOR.textPrimary }}>{title}</h3>
        <span className="text-[11px]" style={{ color: COLOR.textMuted }}>{issues.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {issues.length === 0 ? (
          <div
            className="rounded-xl flex items-center justify-center h-[200px] text-center text-[12px]"
            style={{ color: COLOR.textMuted, border: `1px dashed ${COLOR.borderSoft}` }}
          >
            Nothing here
          </div>
        ) : (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  )
}

type RepoFilter = string // 'all' or a repository full_name

function IssueBoardSection({
  issues,
  issuesError,
  onRetry,
}: {
  issues: AssignedIssue[]
  issuesError: string
  onRetry: () => void
}) {
  const [repoFilter, setRepoFilter] = useState<RepoFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtersRendered, setFiltersRendered] = useState(false)
  const filtersWrapperRef = useRef<HTMLDivElement>(null)

  const repoOptions = useMemo(() => {
    const names = new Set(issues.map((issue) => issue.repository.full_name))
    return Array.from(names).sort()
  }, [issues])

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (repoFilter !== 'all' && issue.repository.full_name !== repoFilter) return false
      return true
    })
  }, [issues, repoFilter])

  const columns = useMemo(() => {
    const open: AssignedIssue[] = []
    const inProgress: AssignedIssue[] = []
    const closed: AssignedIssue[] = []
    for (const issue of filteredIssues) {
      const column = issueColumn(issue)
      if (column === 'open') open.push(issue)
      else if (column === 'in_progress') inProgress.push(issue)
      else closed.push(issue)
    }
    // Within open/in-progress, surface issues needing attention first, then
    // by most recently updated - closed issues sort by most recently closed.
    const byAttentionThenRecency = (a: AssignedIssue, b: AssignedIssue) => {
      const aFlag = needsAttention(a) ? 1 : 0
      const bFlag = needsAttention(b) ? 1 : 0
      if (aFlag !== bFlag) return bFlag - aFlag
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
    open.sort(byAttentionThenRecency)
    inProgress.sort(byAttentionThenRecency)
    closed.sort((a, b) => new Date(b.closed_at ?? b.updated_at).getTime() - new Date(a.closed_at ?? a.updated_at).getTime())
    return { open, inProgress, closed }
  }, [filteredIssues])

  const attentionCount = useMemo(() => issues.filter(needsAttention).length, [issues])
  const hasActiveFilters = repoFilter !== 'all'

  // Closing should play the same drop-in motion in reverse rather than just
  // unmounting instantly, so the panel stays mounted a beat longer while a
  // "closing" animation class plays, then unmounts once that finishes.
  useEffect(() => {
    if (filtersOpen) {
      setFiltersRendered(true)
      return
    }
    if (!filtersRendered) return
    const timeout = setTimeout(() => setFiltersRendered(false), 180)
    return () => clearTimeout(timeout)
  }, [filtersOpen, filtersRendered])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtersWrapperRef.current && !filtersWrapperRef.current.contains(event.target as Node)) {
        setFiltersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (issuesError) {
    return (
      <SectionCard title="Issue Board">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="w-8 h-8" style={{ color: COLOR.accent }} />
          <p className="text-sm" style={{ color: COLOR.textMuted }}>{issuesError}</p>
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium text-white"
            style={{ backgroundColor: COLOR.accent }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </SectionCard>
    )
  }

  if (issues.length === 0) {
    return (
      <SectionCard title="Issue Board">
        <p className="text-sm py-10 text-center" style={{ color: COLOR.textMuted }}>
          No issues are currently assigned to you. Issues assigned to you across every repository you can access will show up here.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={filtersWrapperRef} className="flex items-center gap-3 flex-wrap relative">
        <button
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-[13px] font-medium rounded-full px-3 py-1.5 transition-colors"
          style={{
            color: hasActiveFilters ? COLOR.accent : COLOR.textSecondary,
            backgroundColor: hasActiveFilters ? COLOR.accentSoft : COLOR.cardBgAlt,
          }}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR.accent }} />}
        </button>
        {attentionCount > 0 && (
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: COLOR.accent }}>
            <BellRing className="w-3.5 h-3.5" />
            {attentionCount} need{attentionCount === 1 ? 's' : ''} attention
          </span>
        )}

        {filtersRendered && repoOptions.length > 1 && (
          <div
            className={filtersOpen ? 'animate-drop-in' : 'animate-fall-out'}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              zIndex: 30,
              backgroundColor: COLOR.pageBg,
              border: `1px solid ${COLOR.border}`,
              borderRadius: '14px',
              padding: '10px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
              transformOrigin: 'top left',
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-2 px-1">
              <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: COLOR.textMuted }}>
                <FolderKanban className="w-3.5 h-3.5" />
                Repository
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => setRepoFilter('all')}
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: COLOR.textMuted }}
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap max-w-[320px]">
              <button
                onClick={() => setRepoFilter('all')}
                className="text-[12px] font-medium px-2.5 py-1 rounded-full transition-colors"
                style={{
                  color: repoFilter === 'all' ? COLOR.accent : COLOR.textSecondary,
                  backgroundColor: repoFilter === 'all' ? COLOR.accentSoft : COLOR.cardBg,
                }}
              >
                All
              </button>
              {repoOptions.map((repoName) => (
                <button
                  key={repoName}
                  onClick={() => setRepoFilter(repoName)}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-full transition-colors truncate max-w-[160px]"
                  style={{
                    color: repoFilter === repoName ? COLOR.accent : COLOR.textSecondary,
                    backgroundColor: repoFilter === repoName ? COLOR.accentSoft : COLOR.cardBg,
                  }}
                >
                  {repoName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl p-4 backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(36, 36, 40, 0.65)', border: `1px solid rgba(52, 52, 58, 0.8)` }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <IssueColumnSection title="Open" accentColor="#60a5fa" issues={columns.open} />
          <IssueColumnSection title="In Progress" accentColor={COLOR.accent} issues={columns.inProgress} />
          <IssueColumnSection title="Closed" accentColor="#4ade80" issues={columns.closed} />
        </div>
      </div>
    </div>
  )
}

function buildMonthlySeries(contributions: ContributionDay[]): { label: string; count: number }[] {
  const now = new Date()
  const buckets: { label: string; count: number; year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ label: MONTH_LABELS[d.getMonth()], count: 0, year: d.getFullYear(), month: d.getMonth() })
  }
  for (const day of contributions) {
    const d = new Date(day.date)
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (bucket) bucket.count += day.count
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

function MonthlyActivityChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-2 h-40 px-1">
      {data.map((bucket, i) => {
        const heightPct = bucket.count === 0 ? 2 : Math.max((bucket.count / max) * 100, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <div className="w-full rounded-t-md transition-all" style={{ height: '100%', position: 'relative' }}>
              <span
                className="absolute left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: COLOR.textPrimary, bottom: `calc(${heightPct}% + 6px)` }}
              >
                {bucket.count}
              </span>
              <div
                className="w-full rounded-t-md absolute bottom-0 transition-all group-hover:opacity-80"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: bucket.count === 0 ? COLOR.cardBgAlt : COLOR.accent,
                  minHeight: '3px',
                }}
              />
            </div>
            <span className="text-[11px]" style={{ color: COLOR.textMuted }}>{bucket.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

// Produces "June 24th, 2026" - the exact format requested for heatmap
// tooltips. Intl/toLocaleDateString has no built-in ordinal-suffix support,
// so the day number and suffix are assembled manually around a month/year
// formatter.
function ordinalDateLabel(iso: string): string {
  const date = new Date(iso)
  const day = date.getDate()
  const monthYear = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const [month, year] = monthYear.split(' ')
  return `${month} ${day}${ordinalSuffix(day)}, ${year}`
}

const HEATMAP_WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

interface HeatmapTooltipState {
  text: string
  x: number
  y: number
}

function ContributionHeatmap({ contributions }: { contributions: ContributionDay[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<HeatmapTooltipState | null>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  const { weeks, monthMarkers } = useMemo(() => {
    if (contributions.length === 0) return { weeks: [] as (ContributionDay | null)[][], monthMarkers: [] as { label: string; weekIndex: number }[] }

    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = new Date(sorted[0].date)
    // Pad the front of the grid so the first column starts on a Sunday,
    // matching GitHub's own contribution graph layout.
    const leadingEmptyDays = firstDate.getDay()

    const cells: (ContributionDay | null)[] = new Array(leadingEmptyDays).fill(null)
    cells.push(...sorted)

    const weeks: (ContributionDay | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    const monthMarkers: { label: string; weekIndex: number }[] = []
    let lastMonth = ''
    weeks.forEach((week, weekIndex) => {
      const firstRealDay = week.find((day) => day !== null)
      if (!firstRealDay) return
      const monthLabel = new Date(firstRealDay.date).toLocaleDateString(undefined, { month: 'short' })
      if (monthLabel !== lastMonth) {
        monthMarkers.push({ label: monthLabel, weekIndex })
        lastMonth = monthLabel
      }
    })

    return { weeks, monthMarkers }
  }, [contributions])

  // Cell size used to be a fixed 11px, which left the grid stranded in a
  // fraction of the card on any wider screen - it never grew to use the
  // space it was given. Measuring the actual available width and solving
  // for the largest square (gap included) that still fits every week column
  // means the grid always fills the card edge-to-edge instead of floating
  // at a fixed size inside empty space. Capped at 18px so a narrow contributor
  // history (few weeks) doesn't blow up into oversized tiles.
  useEffect(() => {
    if (!gridRef.current) return
    const el = gridRef.current
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setAvailableWidth(width)
    })
    observer.observe(el)
    setAvailableWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  const weekdayLabelWidth = 22
  const minCellGap = 3
  const weekCount = Math.max(weeks.length, 1)
  const rawCellSize = availableWidth > 0
    ? (availableWidth - weekdayLabelWidth - minCellGap * (weekCount - 1)) / weekCount - minCellGap
    : 11
  const cellSize = Math.min(18, Math.max(8, rawCellSize))
  const cellGap = minCellGap
  const colStep = cellSize + cellGap

  if (weeks.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: COLOR.textMuted }}>No contribution data for this timeframe.</p>
  }

  function showTooltip(day: ContributionDay, e: React.MouseEvent) {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    const text = `${formatNumber(day.count)} contribution${day.count === 1 ? '' : 's'} on ${ordinalDateLabel(day.date)}`
    setTooltip({
      text,
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    })
  }

  function hideTooltip() {
    setTooltip(null)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <div ref={gridRef} className="flex flex-col items-center gap-2 w-full">
        <div className="flex flex-col items-center gap-2" style={{ width: `${weekdayLabelWidth + weeks.length * colStep - cellGap}px` }}>
          <div className="relative h-4 w-full" style={{ marginLeft: `${weekdayLabelWidth}px` }}>
            {monthMarkers.map((marker) => (
              <span
                key={`${marker.label}-${marker.weekIndex}`}
                className="absolute text-[11px]"
                style={{ color: COLOR.textMuted, left: `${marker.weekIndex * colStep}px` }}
              >
                {marker.label}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: `${cellGap}px` }}>
            <div className="flex flex-col shrink-0" style={{ gap: `${cellGap}px`, width: `${weekdayLabelWidth - 6}px` }}>
              {HEATMAP_WEEKDAY_LABELS.map((label, i) => (
                <span key={i} className="text-[10px] leading-none flex items-center" style={{ color: COLOR.textMuted, height: `${cellSize}px` }}>
                  {label}
                </span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col" style={{ gap: `${cellGap}px` }}>
                {week.map((day, dayIndex) =>
                  day ? (
                    <div
                      key={day.date}
                      onMouseEnter={(e) => showTooltip(day, e)}
                      onMouseMove={(e) => showTooltip(day, e)}
                      onMouseLeave={hideTooltip}
                      className="rounded-[3px] cursor-default"
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: levelColor(day.level),
                      }}
                    />
                  ) : (
                    <div key={dayIndex} style={{ width: `${cellSize}px`, height: `${cellSize}px` }} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%) translateY(-10px)',
            zIndex: 50,
          }}
        >
          <div
            className="whitespace-nowrap text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl"
            style={{
              backgroundColor: '#0d0d0f',
              color: COLOR.textPrimary,
              border: `1px solid ${COLOR.border}`,
            }}
          >
            {tooltip.text}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid #0d0d0f`,
            }}
          />
        </div>
      )}
    </div>
  )
}

function buildContributionSeries(contributions: ContributionDay[], range: TimeRange): number[] {
  const days = range === 'weekly' ? 7 : range === 'monthly' ? 30 : 14
  const series: number[] = new Array(days).fill(0)
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  contributions.forEach((day) => {
    const dayTime = new Date(day.date).getTime()
    const dayIndex = days - 1 - Math.floor((now - dayTime) / dayMs)
    if (dayIndex >= 0 && dayIndex < days) {
      series[dayIndex] += day.count
    }
  })
  return series
}

export default function DashboardPage({ username, token, onLogout }: DashboardPageProps) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [languages, setLanguages] = useState<LanguageStat[]>([])
  const [contributions, setContributions] = useState<ContributionDay[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([])
  const [events, setEvents] = useState<GitHubEvent[]>([])
  const [topRepos, setTopRepos] = useState<GitHubRepo[]>([])
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [issues, setIssues] = useState<AssignedIssue[]>([])
  const [issuesError, setIssuesError] = useState('')
  const [pullRequestTotals, setPullRequestTotals] = useState<PullRequestTotals>({
    opened: 0,
    merged: 0,
    closedWithoutMerge: 0,
  })
  const [pullRequestTotalsError, setPullRequestTotalsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [displaySection, setDisplaySection] = useState<Section>('overview')
  const [phase, setPhase] = useState<'entering' | 'settled' | 'leaving'>('entering')
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const [displayTimeRange, setDisplayTimeRange] = useState<TimeRange>('weekly')
  const contentRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchDashboardData(username, token)
      setUser(data.user)
      setStats(data.stats)
      setLanguages(data.languages)
      setContributions(data.contributions)
      setActivityFeed(data.activityFeed)
      setEvents(data.events)
      setTopRepos(data.topRepos)
      setRepos(data.repos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadIssues = async () => {
    setIssuesError('')
    try {
      const assignedIssues = await getAssignedIssues(token)
      setIssues(assignedIssues)
    } catch (err) {
      setIssuesError(err instanceof Error ? err.message : 'Failed to load issues')
    }
  }

  // Real PR counts via the Search API, scoped to the selected range by a
  // `created:>=` date qualifier - not derived from the /events feed, which
  // is what was producing all-zero PR counts (that feed misses/delays
  // PullRequestEvent entries and can't reliably see private-repo activity
  // even with the repo scope granted). Re-runs whenever the visible range
  // changes since the date qualifier is baked into the search query itself.
  const loadPullRequestTotals = async (range: TimeRange) => {
    if (!token || !user) return
    setPullRequestTotalsError('')
    try {
      const sinceIso = range === 'all' ? null : new Date(Date.now() - (RANGE_DAYS[range] ?? 0) * 24 * 60 * 60 * 1000).toISOString()
      const totals = await getPullRequestTotals(user.login, token, sinceIso)
      setPullRequestTotals(totals)
    } catch (err) {
      setPullRequestTotalsError(err instanceof Error ? err.message : 'Failed to load pull requests')
    }
  }

  useEffect(() => {
    if (user) loadPullRequestTotals(displayTimeRange)
  }, [user, displayTimeRange])

  useEffect(() => {
    loadData()
    loadIssues()
  }, [username])

  useEffect(() => {
    if (!loading && !error) {
      setPhase('entering')
      const frame = requestAnimationFrame(() => setPhase('settled'))
      return () => cancelAnimationFrame(frame)
    }
  }, [loading, error])

  useEffect(() => {
    const sectionChanged = activeSection !== displaySection
    const rangeChanged = timeRange !== displayTimeRange
    if (!sectionChanged && !rangeChanged) return
    setPhase('leaving')
    const timeout = setTimeout(() => {
      setDisplaySection(activeSection)
      setDisplayTimeRange(timeRange)
      setPhase('entering')
      requestAnimationFrame(() => setPhase('settled'))
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 180)
    return () => clearTimeout(timeout)
  }, [activeSection, displaySection, timeRange, displayTimeRange])

  const rangedContributions = useMemo(() => {
    let filtered = contributions.filter((day) => isWithinRange(day.date, displayTimeRange))
    if (displayTimeRange === 'all') {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      filtered = filtered.filter((day) => new Date(day.date).getTime() >= oneYearAgo)
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date))
  }, [contributions, displayTimeRange])

  const busiestDay = useMemo(() => {
    if (rangedContributions.length === 0) return null
    return rangedContributions.reduce((best, day) => (day.count > best.count ? day : best), rangedContributions[0])
  }, [rangedContributions])

  const monthlyActivitySeries = useMemo(() => buildMonthlySeries(contributions), [contributions])

  const rangedFeed = useMemo(
    () => activityFeed.filter((item) => isWithinRange(item.timestamp, displayTimeRange)),
    [activityFeed, displayTimeRange],
  )

  const rangedEvents = useMemo(
    () => events.filter((event) => isWithinRange(event.created_at, displayTimeRange)),
    [events, displayTimeRange],
  )

  const priorRangedEvents = useMemo(
    () => events.filter((event) => isWithinPriorRange(event.created_at, displayTimeRange)),
    [events, displayTimeRange],
  )

  const recentRepos = useMemo(() => {
    if (rangedEvents.length === 0) return topRepos.slice(0, 3)
    const activityByRepo = new Map<string, Date>()
    rangedEvents.forEach((event) => {
      const repoName = event.repo.name
      const eventDate = new Date(event.created_at)
      const current = activityByRepo.get(repoName)
      if (!current || eventDate > current) {
        activityByRepo.set(repoName, eventDate)
      }
    })
    const sorted = [...topRepos].sort((a, b) => {
      const dateA = activityByRepo.get(a.name) || activityByRepo.get(a.full_name)
      const dateB = activityByRepo.get(b.name) || activityByRepo.get(b.full_name)
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB.getTime() - dateA.getTime()
    })
    return sorted.slice(0, 3)
  }, [rangedEvents, topRepos])

  const rangeCommitTotals = useMemo(() => {
    const totalAll = contributions.reduce((sum, day) => sum + day.count, 0)
    const weekly = contributions
      .filter((day) => isWithinRange(day.date, 'weekly'))
      .reduce((sum, day) => sum + day.count, 0)
    const monthly = contributions
      .filter((day) => isWithinRange(day.date, 'monthly'))
      .reduce((sum, day) => sum + day.count, 0)
    return {
      weekly,
      monthly,
      allTime: totalAll,
    }
  }, [contributions])

  const rangedCommitCount =
    displayTimeRange === 'weekly'
      ? rangeCommitTotals.weekly
      : displayTimeRange === 'monthly'
      ? rangeCommitTotals.monthly
      : rangeCommitTotals.allTime

  // Estimated, not exact: GitHub's push events don't include diff stats, so
  // this uses the same per-commit multiplier services/github.ts already
  // applies to stats.linesAdded, just scoped per range instead of lifetime-only.
  const linesAddedTotals = useMemo(
    () => ({
      weekly: Math.round(rangeCommitTotals.weekly * 68),
      monthly: Math.round(rangeCommitTotals.monthly * 68),
      allTime: Math.round(rangeCommitTotals.allTime * 68),
    }),
    [rangeCommitTotals],
  )

  const priorCommitCount = useMemo(() => {
    if (displayTimeRange === 'all') return 0
    return contributions
      .filter((day) => isWithinPriorRange(day.date, displayTimeRange))
      .reduce((sum, day) => sum + day.count, 0)
  }, [contributions, displayTimeRange])

  const commitChangePercent = useMemo(
    () => (displayTimeRange === 'all' ? null : percentChange(rangedCommitCount, priorCommitCount)),
    [rangedCommitCount, priorCommitCount, displayTimeRange],
  )

  const commitSeries = useMemo(() => buildContributionSeries(rangedContributions, displayTimeRange), [rangedContributions, displayTimeRange])

  const rangedActiveProjectCount = useMemo(
    () => new Set(rangedEvents.map((event) => event.repo.name)).size,
    [rangedEvents],
  )

  const priorActiveProjectCount = useMemo(
    () => new Set(priorRangedEvents.map((event) => event.repo.name)).size,
    [priorRangedEvents],
  )

  const projectChangePercent = useMemo(
    () => (displayTimeRange === 'all' ? null : percentChange(rangedActiveProjectCount, priorActiveProjectCount)),
    [rangedActiveProjectCount, priorActiveProjectCount, displayTimeRange],
  )

  // Most-starred repo, scoped to repos YOU created within the selected
  // timeline - "the past week/month" should mean repos you actually made
  // in that window, not every repo filtered by some unrelated activity
  // date. created_at is the correct field for that ("when was this repo
  // made"), distinct from pushed_at ("when was it last pushed to") which
  // the Active Repos card already uses for a different question. "Past
  // year" has no created_at cutoff applied since GitHub repo listings
  // aren't capped at 90 days the way /events is - every owned repo is
  // eligible there.
  const mostStarredRepo = useMemo(() => {
    const eligible =
      displayTimeRange === 'all' ? repos : repos.filter((repo) => isWithinRange(repo.created_at, displayTimeRange))
    if (eligible.length === 0) return null
    return eligible.reduce((best, repo) => (repo.stargazers_count > best.stargazers_count ? repo : best), eligible[0])
  }, [repos, displayTimeRange])

  const projectSeries = useMemo(() => {
    const days = displayTimeRange === 'monthly' ? 30 : 7
    const seen = new Array(days).fill(null).map(() => new Set<string>())
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    for (const event of rangedEvents) {
      const dayIndex = days - 1 - Math.floor((now - new Date(event.created_at).getTime()) / dayMs)
      if (dayIndex >= 0 && dayIndex < days) seen[dayIndex].add(event.repo.name)
    }
    return seen.map((set) => set.size)
  }, [rangedEvents, displayTimeRange])

  const dailyAvgCommits = useMemo(() => {
    if (displayTimeRange !== 'all') {
      const daysCount = displayTimeRange === 'weekly' ? 7 : 30
      return rangedCommitCount > 0 ? Math.round((rangedCommitCount / daysCount) * 10) / 10 : 0
    }
    if (contributions.length === 0 || rangedCommitCount === 0) return 0
    const spanDays = Math.max(1, contributions.length)
    return Math.round((rangedCommitCount / spanDays) * 10) / 10
  }, [rangedCommitCount, displayTimeRange, contributions])

  // Active repos = repos with a push in the selected window, computed from
  // the actual repo list (`repos`, fetched from /user/repos with the token's
  // real access) rather than from /events. The personal /events feed only
  // keeps ~90 days of history and is known to be incomplete/delayed for
  // PushEvent entries, which is why "Past year" was reporting numbers far
  // lower than the real repo count - it was silently capped at whatever
  // /events still had cached, not actually counting the past year. Each
  // repo's own `pushed_at` timestamp has no such cap and covers private
  // repos too (since /user/repos is fetched with the token, not the public
  // /users/:username/repos endpoint), so this is the accurate source.
  const activeRepoTotals = useMemo(() => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    const countActiveIn = (range: TimeRange) => {
      if (range === 'all') {
        return repos.filter((repo) => new Date(repo.pushed_at).getTime() >= oneYearAgo).length
      }
      return repos.filter((repo) => isWithinRange(repo.pushed_at, range)).length
    }
    return {
      weekly: countActiveIn('weekly'),
      monthly: countActiveIn('monthly'),
      allTime: countActiveIn('all'),
    }
  }, [repos])

  const bestDayCount = busiestDay?.count ?? 0
  const bestDayLabel = busiestDay && busiestDay.date
    ? new Date(busiestDay.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : undefined

  const rangeNoun = displayTimeRange === 'weekly' ? "this week's" : displayTimeRange === 'monthly' ? "this month's" : "the past year's"
  const overviewSubtitle = `Your coding activity, ${displayTimeRange === 'all' ? 'over the past year' : `over ${rangeNoun.replace("'s", '')}`}.`

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
                {displaySection === 'issues' ? 'Issue Board' : 'Dashboard'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[13px] ${motionClass}`} style={{ color: COLOR.textMuted }}>
                  {displaySection === 'overview' && overviewSubtitle}
                  {displaySection === 'projects' && 'Recent Repositories'}
                  {displaySection === 'issues' && 'Issues assigned to you, aggregated across every repository you can access.'}
                  {displaySection === 'calendar' && 'Past month of contribution history.'}
                </p>
                {displaySection === 'overview' && (
                  <div className={motionClass}>
                    <RangeDropdown value={timeRange} onChange={setTimeRange} />
                  </div>
                )}
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
                        showTrend={displayTimeRange !== 'all'}
                      />
                      <StatCard
                        label="Active Repos"
                        value={formatNumber(
                          displayTimeRange === 'weekly'
                            ? activeRepoTotals.weekly
                            : displayTimeRange === 'monthly'
                            ? activeRepoTotals.monthly
                            : activeRepoTotals.allTime,
                        )}
                        trend={projectSeries}
                        changePercent={projectChangePercent}
                        showTrend={displayTimeRange !== 'all'}
                      />
                      <StatCard
                        label="Daily Avg"
                        value={dailyAvgCommits.toFixed(1)}
                        trend={[]}
                        changePercent={null}
                        showTrend={false}
                      />
                      <StatCard
                        label="Best Day"
                        value={`${formatNumber(bestDayCount)}`}
                        subtext={bestDayLabel}
                        trend={[]}
                        changePercent={null}
                        showTrend={false}
                      />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5" style={staggerStyle(70)}>
                  <DeveloperInsightsCard contributions={contributions} range={displayTimeRange} />

                  <SectionCard title="Activity Feed">
                    {rangedFeed.length === 0 ? (
                      <p className="text-sm py-5 text-center" style={{ color: COLOR.textMuted }}>
                        Nothing here yet. Activity shows up once {username} pushes, opens, or merges something.
                      </p>
                    ) : (
                      <ul>
                        {rangedFeed.slice(0, 7).map((item, idx) => {
                          const Icon = ACTIVITY_ICONS[item.type]
                          const isLast = idx === Math.min(rangedFeed.length, 7) - 1
                          const tag = describeFeedTag(item, repos)
                          const cleanMessage = cleanActivityMessage(item.message)
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
                                  <p className="text-[13px] leading-snug" style={{ color: COLOR.textPrimary }}>{cleanMessage}</p>
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
                  </SectionCard>
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
                  <SectionCard title="Recent Repositories">
                    {recentRepos.length === 0 ? (
                      <p className="text-sm py-3 text-center" style={{ color: COLOR.textMuted }}>No recent activity found.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {recentRepos.map((repo) => (
                          <li key={repo.id}>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 group">
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                                style={{ backgroundColor: COLOR.cardBgAlt }}
                              >
                                <img src="/github.png" alt="" className="w-full h-full object-contain" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] truncate group-hover:underline" style={{ color: COLOR.textPrimary }}>{repo.name}</p>
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={staggerStyle(200)}>
                  <StreaksCard contributions={contributions} />
                  <MostStarredRepoCard repo={mostStarredRepo} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={staggerStyle(230)}>
                  <PullRequestsCard totals={pullRequestTotals} range={displayTimeRange} error={pullRequestTotalsError} />
                  <RangeTotalsCard title="Lines Added" subtext="Across all repos" totals={linesAddedTotals} icon={Code2} />
                </div>

                <div style={staggerStyle(290)}>
                  <SectionCard title="Monthly Activity">
                    <MonthlyActivityChart data={monthlyActivitySeries} />
                  </SectionCard>
                </div>

                <div style={staggerStyle(320)}>
                  <SectionCard title="Contribution Heatmap" bodyClassName="flex flex-col" bodyStyle={{ height: '240px' }}>
                    <ContributionHeatmap contributions={contributions} />
                  </SectionCard>
                </div>
              </div>
            )}

            {displaySection === 'projects' && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${motionClass}`}>
                {repos.length === 0 ? (
                  <p className="text-sm py-6 text-center col-span-full" style={{ color: COLOR.textMuted }}>No repositories found.</p>
                ) : (
                  repos.slice(0, 12).map((repo) => {
                    return (
                      <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-xl"
                        style={{
                          backgroundColor: 'rgba(36, 36, 40, 0.65)',
                          border: `1px solid rgba(52, 52, 58, 0.8)`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                            style={{ backgroundColor: COLOR.cardBgAlt }}
                          >
                            <img src="/github.png" alt="" className="w-full h-full object-contain" />
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
                      </a>
                    )
                  })
                )}
              </div>
            )}

            {displaySection === 'issues' && (
              <div className={motionClass}>
                <IssueBoardSection issues={issues} issuesError={issuesError} onRetry={loadIssues} />
              </div>
            )}

            {displaySection === 'calendar' && (
              <div className={motionClass}>
                <SectionCard title="Contribution Calendar">
                  <p className="text-[12px] mb-4" style={{ color: COLOR.textMuted }}>
                    Each day below shows how many contributions {username} made over the past month, counting commits, pull requests, issues, and other activity.
                  </p>
                  {contributions.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: COLOR.textMuted }}>No contribution data available.</p>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {contributions.slice(-30).map((day) => (
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
                            {day.count} contribution{day.count === 1 ? '' : 's'}
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
