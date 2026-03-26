import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import MetricCard from './components/MetricCard'
import SalesChart from './components/SalesChart'
import AIInsights from './components/AIInsights'
import PPCOptimizer from './components/PPCOptimizer'

export default function App() {
  const [activePage, setActivePage] = useState('Overview')

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 flex flex-col min-w-0">
        {activePage === 'PPC Optimizer' ? (
          <PPCOptimizer />
        ) : (
          <>
            <Header />
            <div className="flex-1 p-6 space-y-6 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total sales" value="$38,920" change="+12.4% vs last week" changePositive={true} icon="💰" />
                <MetricCard title="Orders" value="728" change="+8.2%" changePositive={true} icon="📦" />
                <MetricCard title="Avg. order value" value="$53.46" change="-2.1%" changePositive={false} icon="🛒" />
                <MetricCard title="Conversion rate" value="3.8%" change="+0.4%" changePositive={true} icon="📈" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SalesChart />
                </div>
                <div>
                  <AIInsights />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
