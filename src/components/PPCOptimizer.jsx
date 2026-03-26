export default function PPCOptimizer() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">PPC Optimizer v2</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sandbox running on localhost:5174</p>
        </div>
        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Open in new tab ↗
        </a>
      </div>
      <div className="flex-1">
        <iframe
          src="http://localhost:5174"
          title="PPC Optimizer v2"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 120px)' }}
        />
      </div>
    </div>
  )
}
