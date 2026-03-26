const insights = [
  {
    title: 'Peak sales window',
    text: 'AI suggests promoting high-margin items between 6–9 PM this week based on recent traffic.',
    type: 'tip',
  },
  {
    title: 'Low stock alert',
    text: '3 bestsellers are below reorder point. Restock within 2 days to avoid lost sales.',
    type: 'alert',
  },
  {
    title: 'Competitor price shift',
    text: 'A key competitor lowered prices on 5 overlapping SKUs. Consider a targeted discount.',
    type: 'insight',
  },
]

export default function AIInsights() {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🤖</span>
        <h3 className="text-sm font-semibold text-slate-200">AI Insights</h3>
      </div>
      <ul className="space-y-3">
        {insights.map((item, i) => (
          <li
            key={i}
            className="p-3 rounded-lg bg-slate-700/40 border border-slate-600/50 text-sm"
          >
            <p className="font-medium text-slate-200">{item.title}</p>
            <p className="mt-1 text-slate-400">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
