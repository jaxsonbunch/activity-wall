import { LayoutDashboard, Activity, GitBranch, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  username: string
  avatarUrl: string
  onLogout: () => void
  activeSection: string
  onNavigate: (section: string) => void
}

export default function Sidebar({ username, avatarUrl, onLogout, activeSection, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'projects', label: 'Projects', icon: GitBranch },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className={`flex flex-col h-screen bg-bg-sidebar border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <img src="/logo.svg" alt="PAW" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="text-accent font-bold text-sm tracking-wider">PROJECT</span>
            <span className="text-text-secondary font-bold text-sm tracking-wider">ACTIVITY</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-text-muted hover:text-text-primary transition-colors p-1"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all text-sm"
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-accent hover:bg-accent/10 transition-all text-sm"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <img src={avatarUrl || '/logo.svg'} alt={username} className="w-8 h-8 rounded-full border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{username}</p>
              <p className="text-xs text-text-muted">Developer</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-2">
            <img src={avatarUrl || '/logo.svg'} alt={username} className="w-8 h-8 rounded-full border border-border" />
          </div>
        )}
      </div>
    </div>
  )
}
