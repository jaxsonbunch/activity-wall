import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WeeklyActivity } from '../types/github'

interface WeeklyOverviewProps {
  data: WeeklyActivity[]
}

export default function WeeklyOverview({ data }: WeeklyOverviewProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Weekly Overview</h3>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#16161e', border: '1px solid #1f1f2e', borderRadius: '8px',
                color: '#f1f5f9', fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(220, 38, 38, 0.05)' }}
            />
            <Bar dataKey="commits" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
