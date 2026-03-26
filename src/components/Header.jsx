export default function Header() {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Overview</h1>
        <p className="text-xs text-slate-500">Welcome back. Here’s your store at a glance.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="search"
            placeholder="Search products, orders..."
            className="w-64 pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        </div>
        <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
          🔔
        </button>
        <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-medium">
          U
        </div>
      </div>
    </header>
  )
}
