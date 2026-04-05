"use client";

import { useState, useEffect, useRef } from "react";
import {
  DollarSign, ShoppingCart, TrendingUp, Users,
  ArrowUpRight, ArrowDownRight, Package, Zap, Download,
  Upload, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";
import { metricsApi, uploadsApi } from "@/lib/api";
import { localStore } from "@/lib/local-store";
import type { OverviewMetrics, TrendPoint, TopProduct } from "@/lib/types";
import type { UploadJob } from "@/lib/api";

const DEFAULT_CLIENT_ID = 1;

// ── SVG helpers ────────────────────────────────────────────────────────────

function sparkPoints(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
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
  if (values.length < 2) return "";
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
  if (values.length < 2) return "";
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

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-[#E2E8F0] rounded", className)} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string; value: string; change: string; up: boolean; sub: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  sparkData: number[]; sparkColor: string;
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
        {pts && (
          <svg width={80} height={28} className="shrink-0">
            <polyline points={pts} fill="none" stroke={sparkColor} strokeWidth={1.8}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
        <Upload size={28} className="text-[#2563EB]" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-[#0F172A]">No data yet</p>
        <p className="text-sm text-[#94A3B8] mt-1 max-w-xs">
          Upload your Amazon reports to see live metrics here
        </p>
      </div>
      <Link
        href="/dashboard/data-upload"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#2563EB" }}
      >
        <Upload size={15} />
        Upload Reports
      </Link>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = ["7D", "14D", "30D"] as const;
type Range = typeof RANGE_OPTIONS[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "14D": 14, "30D": 30 };

export default function OverviewPage() {
  const [range, setRange] = useState<Range>("30D");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadJob[]>([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAll(RANGE_DAYS[range]);
  }, [range]);

  async function loadAll(days: number) {
    setLoading(true);
    try {
      const [ov, tr, tp, uploads] = await Promise.allSettled([
        metricsApi.getOverview(),
        metricsApi.getTrend(days),
        metricsApi.getTopProducts(5),
        uploadsApi.listJobs(DEFAULT_CLIENT_ID),
      ]);
      if (ov.status === "fulfilled") setOverview(ov.value);
      if (tr.status === "fulfilled") setTrend(tr.value);
      if (tp.status === "fulfilled") setTopProducts(tp.value);
      if (uploads.status === "fulfilled") setRecentUploads(uploads.value.slice(0, 5));
    } catch { /* ignore */ }

    // Fall back to localStorage if API returned nothing
    if (!overview && !trend.length && localStore.hasData()) {
      const localTrend = localStore.getTrend();
      const localProducts = localStore.getProducts();
      const { totalRevenue, totalOrders, totalSpend } = localStore.getOverview();
      setTrend(localTrend);
      setTopProducts(localProducts.slice(0, 5) as unknown as TopProduct[]);
      setOverview({
        revenue: { value: totalRevenue, formatted: `$${totalRevenue.toLocaleString()}`, change: 0, changeLabel: "—", trend: "flat" },
        orders: { value: totalOrders, change: 0, changeLabel: "—", trend: "flat" },
        adSpend: { value: totalSpend, formatted: `$${totalSpend.toLocaleString()}`, acos: totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0, roas: totalSpend > 0 ? totalRevenue / totalSpend : 0 },
        activeClients: 1,
      });
      setRecentUploads(
        localStore.getUploads().slice(0, 5).map((u, i) => ({
          id: i + 1, client_id: 1, report_type: u.report_type as "business_report" | "ppc" | "search_terms",
          filename: u.filename, file_size: 0, status: "completed" as const,
          rows_parsed: u.row_count, rows_inserted: u.row_count,
          created_at: u.date,
        }))
      );
    }
    setLoading(false);
  }

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

  const hasData = !loading && (overview !== null || trend.length > 0);
  const revenues = trend.map((d) => d.revenue);
  const adSpends = trend.map((d) => d.adSpend);
  const W = 700; const H = 160;
  const revArea = areaPoints(revenues, W, H);
  const revLine = linePoints(revenues, W, H);
  const adLine  = linePoints(adSpends, W, H);

  const maxRev = revenues.length ? Math.max(...revenues) : 1;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round((maxRev * 0.9 + (maxRev * 1.02 - maxRev * 0.9) * t) / 100) * 100
  );
  const step = Math.ceil(trend.length / 5) || 1;
  const xLabels = trend.filter((_, i) => i % step === 0 || i === trend.length - 1);

  const totalRevenue = revenues.reduce((s, v) => s + v, 0);
  const totalAd = adSpends.reduce((s, v) => s + v, 0);
  const tacos = totalRevenue > 0 ? ((totalAd / totalRevenue) * 100).toFixed(1) : "0.0";

  // Build sparklines from trend slices (last 8 points)
  const spark8 = trend.slice(-8);
  const sparkRevenue = spark8.map((d) => d.revenue);
  const sparkOrders = spark8.map((d) => d.orders);
  const sparkAd = spark8.map((d) => d.adSpend);

  function fmt$(n: number) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toLocaleString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Overview</h2>
          <p className="text-sm text-[#94A3B8] mt-1">Your key metrics at a glance — last {range}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAll(RANGE_DAYS[range])}
            className="p-2 rounded-lg border border-[#E2E8F0] text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
                <Skeleton className="w-10 h-10" />
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-32 h-7" />
                <Skeleton className="w-20 h-3" />
              </div>
            ))}
          </div>
          <Skeleton className="w-full h-64 rounded-xl" />
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <EmptyState />
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={overview ? fmt$(overview.revenue.value) : "—"}
              change={overview?.revenue.changeLabel ?? "+0%"}
              up={(overview?.revenue.trend ?? "up") !== "down"}
              sub="vs previous period"
              icon={DollarSign} iconBg="#EFF6FF" iconColor="#2563EB"
              sparkData={sparkRevenue} sparkColor="#2563EB"
            />
            <KpiCard
              label="Total Orders"
              value={overview ? overview.orders.value.toLocaleString() : "—"}
              change={overview?.orders.changeLabel ?? "+0%"}
              up={(overview?.orders.trend ?? "up") !== "down"}
              sub="last 30 days"
              icon={ShoppingCart} iconBg="#F0FDF4" iconColor="#10B981"
              sparkData={sparkOrders} sparkColor="#10B981"
            />
            <KpiCard
              label="Ad Spend"
              value={overview ? fmt$(overview.adSpend.value) : "—"}
              change={`TACoS ${tacos}%`}
              up={parseFloat(tacos) < 15}
              sub={`ACoS ${overview ? overview.adSpend.acos.toFixed(1) : "0"}%`}
              icon={TrendingUp} iconBg="#FDF4FF" iconColor="#9333EA"
              sparkData={sparkAd} sparkColor="#9333EA"
            />
            <KpiCard
              label="Active Clients"
              value={overview ? String(overview.activeClients) : "—"}
              change="+0"
              up
              sub="in your account"
              icon={Users} iconBg="#FFF7ED" iconColor="#F59E0B"
              sparkData={[overview?.activeClients ?? 0]}
              sparkColor="#F59E0B"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Revenue & Ad Spend trend */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Revenue & Ad Spend Trend</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Total: <strong className="text-[#0F172A]">{fmt$(totalRevenue)}</strong> revenue
                    · <strong className="text-purple-500">{fmt$(totalAd)}</strong> ad spend
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

              {trend.length < 2 ? (
                <div className="flex items-center justify-center h-40 text-sm text-[#94A3B8]">
                  Not enough data points — upload more reports
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-5 pr-2 text-right">
                    {[...yTicks].reverse().map((v, i) => (
                      <span key={i} className="text-[10px] text-[#CBD5E1] tabular-nums">
                        {fmt$(v)}
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
                      <polyline points={adLine} fill="none" stroke="#9333EA" strokeWidth={1.8}
                        strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                    <div className="flex justify-between mt-1">
                      {xLabels.map(({ date }) => (
                        <span key={date} className="text-[10px] text-[#CBD5E1]">
                          {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4">
                <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                  <span className="w-3 h-0.5 rounded bg-[#2563EB] inline-block" />Revenue
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                  <span className="w-3 h-0.5 rounded bg-purple-500 inline-block" />Ad Spend
                </span>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Package size={15} style={{ color: "#2563EB" }} />
                <h3 className="text-sm font-semibold text-[#0F172A]">Top Products</h3>
              </div>

              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Package size={22} className="text-[#CBD5E1]" />
                  <p className="text-xs text-[#94A3B8]">Upload a Business Report to see top products</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map(({ asin, title, revenue, share_pct }, i) => (
                    <div key={asin}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-[#334155] font-medium truncate flex-1 mr-2" title={title}>
                          {title || asin}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A] tabular-nums shrink-0">
                          {fmt$(revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share_pct}%`,
                              backgroundColor: ["#2563EB","#10B981","#9333EA","#F59E0B","#EF4444"][i],
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#94A3B8] tabular-nums w-8 text-right">{share_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TACoS mini */}
              {trend.length >= 2 && (
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
                      const tacosData = trend.map((d) => d.revenue > 0 ? (d.adSpend / d.revenue) * 100 : 0);
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
              )}
            </div>
          </div>

          {/* Recent Uploads feed */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-semibold text-[#0F172A]">Recent Uploads</h3>
              <Link href="/dashboard/data-upload" className="text-xs text-[#2563EB] font-medium hover:underline">
                Upload new →
              </Link>
            </div>
            {recentUploads.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-[#94A3B8]">
                No uploads yet —{" "}
                <Link href="/dashboard/data-upload" className="text-[#2563EB] font-medium hover:underline">
                  upload your first report
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {recentUploads.map((job) => {
                  const STATUS_DOT: Record<string, string> = {
                    completed: "bg-emerald-400", processing: "bg-amber-400 animate-pulse",
                    failed: "bg-red-400", pending: "bg-slate-400",
                  };
                  const REPORT_LABEL: Record<string, string> = {
                    business_report: "Business Report", ppc: "Sponsored Ads", search_terms: "Search Terms",
                  };
                  return (
                    <li key={job.id} className="flex items-start gap-3 px-6 py-3 hover:bg-[#F8FAFC] transition-colors">
                      <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[job.status] ?? "bg-slate-400")} />
                      <span className="flex-1 text-sm text-[#475569] leading-snug">
                        <strong className="text-[#0F172A]">{job.filename}</strong>
                        {" — "}{REPORT_LABEL[job.report_type] ?? job.report_type}
                        {job.status === "completed" && ` · ${job.rows_inserted?.toLocaleString()} rows`}
                      </span>
                      <span className="text-xs text-[#CBD5E1] shrink-0 whitespace-nowrap capitalize">{job.status}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <PdfDateRangeModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={downloadPdf}
        reportName="Overview"
      />
    </div>
  );
}
