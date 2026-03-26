const navItems = [
  { label: 'Overview', icon: '📊' },
  { label: 'Sales', icon: '💰' },
  { label: 'Orders', icon: '📦' },
  { label: 'Inventory', icon: '📋' },
  { label: 'AI Insights', icon: '🤖' },
  { label: 'PPC Optimizer', icon: '🎯' },
  { label: 'Reports', icon: '📈' },
  { label: 'Settings', icon: '⚙️' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-56 min-h-screen bg-slate-900/80 border-r border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-slate-100">AI Amazon</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate(item.label) }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activePage === item.label
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2 text-xs text-slate-500">
          Dashboard v1.0
        </div>
      </div>
    </aside>
  )
}
