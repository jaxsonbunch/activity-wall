import type { ContributionDay } from '../types/github'

interface ContributionHeatmapProps {
  contributions: ContributionDay[]
}

const levelColors: Record<number, string> = {
  0: 'bg-bg-secondary',
  1: 'bg-accent/20',
  2: 'bg-accent/40',
  3: 'bg-accent/60',
  4: 'bg-accent',
}

export default function ContributionHeatmap({ contributions }: ContributionHeatmapProps) {
  const weeks: ContributionDay[][] = []
  const daysPerWeek = 7
  for (let i = 0; i < contributions.length; i += daysPerWeek) {
    weeks.push(contributions.slice(i, i + daysPerWeek))
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Contribution Heatmap</h3>
      </div>
      <div className="p-5">
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 rounded-sm ${levelColors[day.level]} transition-all hover:scale-110`}
                  title={`${day.date}: ${day.count} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`w-3 h-3 rounded-sm ${levelColors[level]}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
