import { Star, GitFork, ExternalLink } from 'lucide-react'
import type { GitHubRepo } from '../types/github'

interface TopRepositoriesProps {
  repos: GitHubRepo[]
}

const languageColors: Record<string, string> = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Go: '#00add8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4f5d95', Swift: '#ffac45', Kotlin: '#a97bff', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', React: '#61dafb', Dart: '#00b4ab',
  Scala: '#c22d40', R: '#276dc3', Julia: '#a270ba', Elixir: '#6e4a7e', Haskell: '#5e5086',
  Lua: '#000080', Perl: '#0298c3', Objective: '#438eff', Matlab: '#e16737', Groovy: '#e69f56',
  Clojure: '#db5855', Crystal: '#000100', Nim: '#ffe953', Zig: '#ec915c',
}

export default function TopRepositories({ repos }: TopRepositoriesProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Top Repositories</h3>
      </div>
      <div className="p-4 space-y-2">
        {repos.map((repo) => (
          <div key={repo.id} className="p-3 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent hover:underline truncate">
                    {repo.name}
                  </a>
                  <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                {repo.description && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-1">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {repo.language && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: languageColors[repo.language] || '#8b8b8b' }} />
                      <span className="text-xs text-text-muted">{repo.language}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-text-muted">
                    <Star className="w-3 h-3" />
                    <span className="text-xs">{repo.stargazers_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted">
                    <GitFork className="w-3 h-3" />
                    <span className="text-xs">{repo.forks_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
