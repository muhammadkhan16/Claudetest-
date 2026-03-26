import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { day: 'Mon', sales: 4200, orders: 89 },
  { day: 'Tue', sales: 3800, orders: 72 },
  { day: 'Wed', sales: 5100, orders: 98 },
  { day: 'Thu', sales: 4600, orders: 84 },
  { day: 'Fri', sales: 6200, orders: 112 },
  { day: 'Sat', sales: 7800, orders: 145 },
  { day: 'Sun', sales: 7100, orders: 128 },
]

export default function SalesChart() {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Sales (last 7 days)</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value) => [`$${value}`, 'Sales']}
            />
            <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={2} fill="url(#salesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
