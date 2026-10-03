export default function Header({ tab, setTab }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="logo">🎮</span>
        <div>
          <h1 className="header-title">Libretro Super</h1>
          <span className="header-subtitle">Core Browser & Build Recipes</span>
        </div>
      </div>
      <nav className="tabs">
        <button
          className={`tab ${tab === 'cores' ? 'active' : ''}`}
          onClick={() => setTab('cores')}
        >
          Cores
        </button>
        <button
          className={`tab ${tab === 'recipes' ? 'active' : ''}`}
          onClick={() => setTab('recipes')}
        >
          Recipes
        </button>
      </nav>
    </header>
  )
}
