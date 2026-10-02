export default function StatsBar({ stats }) {
  const { totalCores, platformCount, categories, licenses } = stats
  const emulatorCount = categories['Emulator'] || 0
  const gameCount = categories['Game'] || 0
  const gplCount = Object.entries(licenses)
    .filter(([k]) => k.includes('GPL'))
    .reduce((s, [, v]) => s + v, 0)

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-value">{totalCores}</span>
        <span className="stat-label">Total Cores</span>
      </div>
      <div className="stat">
        <span className="stat-value">{emulatorCount}</span>
        <span className="stat-label">Emulators</span>
      </div>
      <div className="stat">
        <span className="stat-value">{gameCount}</span>
        <span className="stat-label">Games</span>
      </div>
      <div className="stat">
        <span className="stat-value">{platformCount}</span>
        <span className="stat-label">Platforms</span>
      </div>
      <div className="stat">
        <span className="stat-value">{gplCount}</span>
        <span className="stat-label">GPL Licensed</span>
      </div>
    </div>
  )
}
