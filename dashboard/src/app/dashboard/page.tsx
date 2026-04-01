"use client";

import { useState, useRef } from "react";
import {
  DollarSign, ShoppingCart, TrendingUp, Users,
  ArrowUpRight, ArrowDownRight, Package, Zap, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";

// ── Mock data ──────────────────────────────────────────────────────────────

const DAILY: { day: string; revenue: number; profit: number; adSpend: number }[] = [
  { day: "Feb 10", revenue: 3200, profit: 820,  adSpend: 480 },
  { day: "Feb 11", revenue: 3850, profit: 1020, adSpend: 510 },
  { day: "Feb 12", revenue: 2900, profit: 680,  adSpend: 430 },
  { day: "Feb 13", revenue: 4100, profit: 1180, adSpend: 560 },
  { day: "Feb 14", revenue: 5200, profit: 1620, adSpend: 720 },
  { day: "Feb 15", revenue: 4800, profit: 1450, adSpend: 670 },
  { day: "Feb 16", revenue: 3600, profit: 950,  adSpend: 530 },
  { day: "Feb 17", revenue: 4400, profit: 1280, adSpend: 610 },
  { day: "Feb 18", revenue: 4200, profit: 1190, adSpend: 590 },
  { day: "Feb 19", revenue: 3900, profit: 1060, adSpend: 550 },
  { day: "Feb 20", revenue: 4700, profit: 1380, adSpend: 650 },
  { day: "Feb 21", revenue: 5100, profit: 1560, adSpend: 710 },
  { day: "Feb 22", revenue: 4600, profit: 1320, adSpend: 640 },
  { day: "Feb 23", revenue: 3800, profit: 1020, adSpend: 540 },
  { day: "Feb 24", revenue: 4300, profit: 1250, adSpend: 600 },
  { day: "Feb 25", revenue: 4900, profit: 1480, adSpend: 680 },
  { day: "Feb 26", revenue: 5400, profit: 1720, adSpend: 750 },
  { day: "Feb 27", revenue: 5000, profit: 1600, adSpend: 700 },
  { day: "Feb 28", revenue: 4500, profit: 1360, adSpend: 630 },
  { day: "Mar 01", revenue: 3700, profit: 980,  adSpend: 520 },
  { day: "Mar 02", revenue: 4100, profit: 1150, adSpend: 570 },
  { day: "Mar 03", revenue: 4800, profit: 1440, adSpend: 660 },
  { day: "Mar 04", revenue: 5200, profit: 1650, adSpend: 720 },
  { day: "Mar 05", revenue: 5600, profit: 1820, adSpend: 780 },
  { day: "Mar 06", revenue: 5100, profit: 1600, adSpend: 710 },
  { day: "Mar 07", revenue: 4700, profit: 1390, adSpend: 655 },
  { day: "Mar 08", revenue: 5300, profit: 1700, adSpend: 740 },
  { day: "Mar 09", revenue: 5800, profit: 1900, adSpend: 810 },
  { day: "Mar 10", revenue: 5500, profit: 1780, adSpend: 770 },
  { day: "Mar 11", revenue: 4200, profit: 1220, adSpend: 590 },
];

const TOP_PRODUCTS = [
  { name: "Wireless Earbuds Pro",  revenue: 18420, share: 32 },
  { name: "Laptop Stand Aluminum", revenue: 11870, share: 21 },
  { name: "USB-C Hub 7-Port",      revenue: 9300,  share: 16 },
  { name: "Desk Cable Organizer",  revenue: 6540,  share: 11 },
  { name: "Monitor Light Bar",     revenue: 5990,  share: 10 },
];

const ACTIVITY = [
  { text: "AMZ-003 ACoS exceeded 15% threshold",                          type: "warning", time: "2 min ago"  },
  { text: "AMZ-001 hit #1 BSR in Electronics > Earbuds",                  type: "success", time: "14 min ago" },
  { text: "AMZ-007 campaign paused — negative margin detected",           type: "danger",  time: "1 hr ago"   },
  { text: "CSV upload processed: PPC Report Mar 10 (1,842 rows)",         type: "info",    time: "3 hr ago"   },
  { text: "AMZ-002 listing score improved 71 → 81 after title update",    type: "success", time: "5 hr ago"   },
];

// ── SVG helpers ────────────────────────────────────────────────────────────

function sparkPoints(values: number[], w: number, h: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPoints(values: number[], w: number, h: number): string {
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `0,${h} ` + pts.join(" ") + ` ${w},${h}`;
}

function linePoints(values: number[], w: number, h: number): string {
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string; value: string; change: string; up: boolean; sub: string;
  icon: React.ElementType; iconBg: string; iconColor: string; sparkData: number[]; sparkColor: string;
}

function KpiCard({ label, value, change, up, sub, icon: Icon, iconBg, iconColor, sparkData, sparkColor }: KpiCardProps) {
  const pts = sparkPoints(sparkData, 80, 28);
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: iconBg }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        <span className={cn(
          "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
          up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
        )}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
      <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
      <p className="text-2xl font-bold text-[#0F172A] mt-0.5 tabular-nums">{value}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-xs text-[#CBD5E1]">{sub}</p>
        <svg width={80} height={28} className="shrink-0">
          <polyline points={pts} fill="none" stroke={sparkColor} strokeWidth={1.8}
            strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = ["7D", "14D", "30D"] as const;
type Range = typeof RANGE_OPTIONS[number];
const RANGE_SLICE: Record<Range, number> = { "7D": 7, "14D": 14, "30D": 30 };

export default function OverviewPage() {
  const [range, setRange] = useState<Range>("30D");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function downloadPdf(dateRange: { label: string; from: Date; to: Date }) {
    if (!reportRef.current) return;
    try {
      await captureToPdf(reportRef.current, {
        filename: `overview-report-${dateRange.from.toISOString().slice(0, 10)}.pdf`,
        orientation: "landscape",
        header: `Overview Report | Period: ${dateRange.label}`,
      });
    } catch (e) { alert("PDF failed: " + e); }
  }

  const slice    = DAILY.slice(-RANGE_SLICE[range]);
  const revenues = slice.map((d) => d.revenue);
  const profits  = slice.map((d) => d.profit);
  const adSpends = slice.map((d) => d.adSpend);

  const W = 700; const H = 160;

  const revArea  = areaPoints(revenues, W, H);
  const revLine  = linePoints(revenues, W, H);
  const profLine = linePoints(profits,  W, H);

  const maxRev = Math.max(...revenues);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round((maxRev * 0.9 + (maxRev * 1.02 - maxRev * 0.9) * t) / 1000) * 1000
  );
  const step    = Math.ceil(slice.length / 5);
  const xLabels = slice.filter((_, i) => i % step === 0 || i === slice.length - 1);

  const totalRevenue = revenues.reduce((s, v) => s + v, 0);
  const totalProfit  = profits.reduce((s, v) => s + v, 0);
  const totalAd      = adSpends.reduce((s, v) => s + v, 0);
  const tacos        = ((totalAd / totalRevenue) * 100).toFixed(1);

  const revenueWeekly = [12400, 13800, 11900, 14500, 15200, 14800, 16100, 15900];
  const ordersWeekly  = [310,   345,   298,   362,   381,   370,   402,   398];
  const adSpendWeekly = [2100,  2350,  1980,  2490,  2620,  2510,  2730,  2680];
  const clientsWeekly = [44,    44,    45,    45,    46,    46,    47,    47];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Overview</h2>
          <p className="text-sm text-[#94A3B8] mt-1">Your key metrics at a glance — last {range}</p>
        </div>
        <button
          onClick={() => setPdfModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
        >
          <Download size={14} />
          Export PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div ref={reportRef} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value="$124.6k" change="+12.5%" up sub="vs $110.8k last period"
          icon={DollarSign} iconBg="#EFF6FF" iconColor="#2563EB" sparkData={revenueWeekly} sparkColor="#2563EB" />
        <KpiCard label="Total Orders" value="3,842" change="+8.1%" up sub="avg $32.40 / order"
          icon={ShoppingCart} iconBg="#F0FDF4" iconColor="#10B981" sparkData={ordersWeekly} sparkColor="#10B981" />
        <KpiCard label="Ad Spend" value="$18.2k" change="-2.4%" up={false} sub={`TACoS ${tacos}%`}
          icon={TrendingUp} iconBg="#FDF4FF" iconColor="#9333EA" sparkData={adSpendWeekly} sparkColor="#9333EA" />
        <KpiCard label="Active Clients" value="47" change="+3" up sub="4 audits due this week"
          icon={Users} iconBg="#FFF7ED" iconColor="#F59E0B" sparkData={clientsWeekly} sparkColor="#F59E0B" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue + Profit trend */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Revenue & Profit Trend</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Total: <strong className="text-[#0F172A]">${(totalRevenue / 1000).toFixed(1)}k</strong> revenue
                · <strong className="text-emerald-500">${(totalProfit / 1000).toFixed(1)}k</strong> profit
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#F8FAFC] rounded-lg p-0.5 border border-[#E2E8F0]">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    range === r
                      ? "bg-white text-[#2563EB] shadow-sm border border-[#E2E8F0]"
                      : "text-[#94A3B8] hover:text-[#64748B]"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-5 pr-2 text-right">
              {[...yTicks].reverse().map((v, i) => (
                <span key={i} className="text-[10px] text-[#CBD5E1] tabular-nums">
                  ${(v / 1000).toFixed(0)}k
                </span>
              ))}
            </div>
            <div className="ml-8">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible"
                style={{ height: H }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((t) => (
                  <line key={t} x1={0} y1={H * t} x2={W} y2={H * t}
                    stroke="#E2E8F0" strokeWidth={1} />
                ))}
                <polygon points={revArea} fill="url(#revGrad)" />
                <polyline points={revLine} fill="none" stroke="#2563EB" strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={profLine} fill="none" stroke="#10B981" strokeWidth={1.8}
                  strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div className="flex justify-between mt-1">
                {xLabels.map(({ day }) => (
                  <span key={day} className="text-[10px] text-[#CBD5E1]">{day}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <span className="w-3 h-0.5 rounded bg-[#2563EB] inline-block" />Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <span className="w-3 h-0.5 rounded bg-emerald-500 inline-block" />Net Profit
            </span>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Package size={15} style={{ color: "#2563EB" }} />
            <h3 className="text-sm font-semibold text-[#0F172A]">Top Products</h3>
          </div>
          <div className="space-y-4">
            {TOP_PRODUCTS.map(({ name, revenue, share }, i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[#334155] font-medium truncate flex-1 mr-2">{name}</span>
                  <span className="text-xs font-semibold text-[#0F172A] tabular-nums shrink-0">
                    ${(revenue / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        backgroundColor: ["#2563EB","#10B981","#9333EA","#F59E0B","#EF4444"][i],
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8] tabular-nums w-8 text-right">{share}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* TACoS mini */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap size={12} style={{ color: "#2563EB" }} />
                <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">TACoS Trend</h4>
              </div>
              <span className={cn(
                "text-xs font-bold tabular-nums",
                parseFloat(tacos) > 15 ? "text-red-500" : parseFloat(tacos) > 12 ? "text-amber-500" : "text-emerald-500"
              )}>
                {tacos}%
              </span>
            </div>
            <svg viewBox="0 0 200 36" className="w-full" style={{ height: 36 }} preserveAspectRatio="none">
              {(() => {
                const tacosData = slice.map((d) => (d.adSpend / d.revenue) * 100);
                const pts  = linePoints(tacosData, 200, 36);
                const area = areaPoints(tacosData, 200, 36);
                return (
                  <>
                    <defs>
                      <linearGradient id="tacosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0"   />
                      </linearGradient>
                    </defs>
                    <polygon points={area} fill="url(#tacosGrad)" />
                    <polyline points={pts} fill="none" stroke="#2563EB" strokeWidth={1.5}
                      strokeLinejoin="round" strokeLinecap="round" />
                  </>
                );
              })()}
            </svg>
            <p className="text-xs text-[#CBD5E1] mt-1">
              {parseFloat(tacos) <= 12
                ? "Healthy — within 12% target"
                : parseFloat(tacos) <= 15
                ? "Watch — approaching 15% threshold"
                : "High — reduce PPC bids"}
            </p>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Recent Activity</h3>
        </div>
        <ul className="divide-y divide-[#F1F5F9]">
          {ACTIVITY.map(({ text, type, time }) => (
            <li key={text} className="flex items-start gap-3 px-6 py-3 hover:bg-[#F8FAFC] transition-colors">
              <span className={cn(
                "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                type === "success" ? "bg-emerald-400"
                : type === "warning" ? "bg-amber-400"
                : type === "danger"  ? "bg-red-400"
                : "bg-blue-400"
              )} />
              <span className="flex-1 text-sm text-[#475569] leading-snug">{text}</span>
              <span className="text-xs text-[#CBD5E1] shrink-0 whitespace-nowrap">{time}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
      <PdfDateRangeModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={downloadPdf}
        reportName="Overview"
      />
    </div>
  );
}
