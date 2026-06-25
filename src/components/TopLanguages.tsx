import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { LanguageStat } from '../types/github'

interface TopLanguagesProps {
  languages: LanguageStat[]
}

export default function TopLanguages({ languages }: TopLanguagesProps) {
  if (languages.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Top Languages</h3>
        </div>
        <div className="p-5 text-center text-text-muted text-sm">No data available</div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Top Languages</h3>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={languages} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="count" stroke="none">
                  {languages.map((lang, index) => (
                    <Cell key={index} fill={lang.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#16161e', border: '1px solid #1f1f2e', borderRadius: '8px',
                    color: '#f1f5f9', fontSize: '12px',
                  }}
                  formatter={(value) => [`${value} repos`, '']}
                  labelFormatter={(label) => label as string}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {languages.map((lang) => (
              <div key={lang.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: lang.color }} />
                <span className="text-xs text-text-primary flex-1">{lang.name}</span>
                <span className="text-xs text-text-muted">{lang.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
