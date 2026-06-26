interface HomePageProps {
  onUsernameSubmit: (name: string) => void
}

export default function HomePage(_: HomePageProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#17171a' }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl p-12 text-center"
        style={{
          backgroundColor: 'rgba(36, 36, 40, 0.75)',
          border: '1px solid #34343a',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/logo.png" alt="logo" className="w-10 h-10" />
          <h1 className="text-4xl font-bold text-white">Activity Wall</h1>
        </div>

        <p className="text-gray-400 text-sm mb-10">
          Your GitHub activity, rebuilt into a clean dashboard
        </p>

        <div className="flex justify-center mb-10">
          <img src="/GitHub.png" alt="github" className="w-12 h-12" />
        </div>

        <a
          href="https://github.com/wasteofwifi/activity-wall"
          className="text-white text-sm"
        >
          GitHub Repo
        </a>
      </div>
    </div>
  )
}
