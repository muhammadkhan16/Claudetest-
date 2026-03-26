export default function MetricCard({ title, value, change, changePositive, icon }) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
          {change != null && (
            <p className={`mt-1 text-sm font-medium ${changePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {changePositive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </div>
  )
}
