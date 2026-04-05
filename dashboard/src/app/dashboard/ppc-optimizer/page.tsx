"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Target, AlertTriangle, CheckCircle2, TrendingDown,
  TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowDownRight, ArrowUpRight, DollarSign, Download,
  Upload, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetCloseButton, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";
import { ingestedApi, type IngestedCampaign, type WastedKeyword } from "@/lib/api";
import { localStore } from "@/lib/local-store";

// ── Types ──────────────────────────────────────────────────────────────────

type SortKey = "ad_spend" | "ad_sales" | "acos" | "roas" | "ctr" | "cvr" | "ad_orders";

type DaysOption = 7 | 14 | 30;

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_MAP = {
  healthy:  { label: "Healthy",  variant: "success" as const, Icon: CheckCircle2 },
  warning:  { label: "Warning",  variant: "warning" as const, Icon: AlertTriangle },
  critical: { label: "Critical", variant: "danger"  as const, Icon: XCircle      },
  no_sales: { label: "No Sales", variant: "default" as const, Icon: TrendingDown  },
} satisfies Record<IngestedCampaign["status"], { label: string; variant: "success" | "warning" | "danger" | "default"; Icon: React.ElementType }>;

const DAYS_OPTIONS: DaysOption[] = [30, 14, 7];

// ── Helpers ────────────────────────────────────────────────────────────────

const FMT = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const FMT_DECIMAL = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FMT_K = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString());

function AcosBar({ acos }: { acos: number }) {
  // Color thresholds: green < 15%, amber 15-25%, red > 25%
  const color = acos > 25 ? "#EF4444" : acos >= 15 ? "#F59E0B" : "#10B981";
  const pct = Math.min((acos / 50) * 100, 100); // scale up to 50% as max
  return (
    <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Skeleton Components ────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-[#F1F5F9] rounded-lg" />
        <div className="w-16 h-5 bg-[#F1F5F9] rounded-full" />
      </div>
      <div className="w-24 h-3 bg-[#F1F5F9] rounded mb-2" />
      <div className="w-32 h-7 bg-[#F1F5F9] rounded mb-1" />
      <div className="w-20 h-3 bg-[#F1F5F9] rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-[#F1F5F9]">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-[#F1F5F9] rounded" style={{ width: i === 0 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PPCOptimizerPage() {
  // Data state
  const [campaigns, setCampaigns] = useState<IngestedCampaign[]>([]);
  const [wastedKeywords, setWastedKeywords] = useState<WastedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [clientId] = useState<number>(1);
  const [days, setDays] = useState<DaysOption>(30);

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>("ad_spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Sheet state
  const [selected, setSelected] = useState<IngestedCampaign | null>(null);

  // PDF state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignData, wastedData] = await Promise.all([
        ingestedApi.getCampaigns(clientId, days),
        ingestedApi.getWastedKeywords(clientId, days),
      ]);
      if (campaignData.length > 0) {
        setCampaigns(campaignData);
        setWastedKeywords(wastedData);
      } else if (localStore.hasData()) {
        setCampaigns(localStore.getCampaigns() as typeof campaignData);
        setWastedKeywords(localStore.getWastedKeywords());
      }
    } catch {
      if (localStore.hasData()) {
        setCampaigns(localStore.getCampaigns() as ReturnType<typeof ingestedApi.getCampaigns> extends Promise<infer T> ? T : never);
        setWastedKeywords(localStore.getWastedKeywords());
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived metrics ────────────────────────────────────────────────────

  const totalSpend  = campaigns.reduce((s, c) => s + c.ad_spend, 0);
  const totalSales  = campaigns.reduce((s, c) => s + c.ad_sales, 0);
  const totalOrders = campaigns.reduce((s, c) => s + c.ad_orders, 0);
  const blendedAcos = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : "0.0";
  const totalWaste  = wastedKeywords.reduce((s, k) => s + k.spend, 0);

  // ── Sort ───────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [campaigns, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  // ── PDF ────────────────────────────────────────────────────────────────

  async function downloadPdf(dateRange: { label: string; from: Date; to: Date }) {
    if (!reportRef.current) return;
    try {
      await captureToPdf(reportRef.current, {
        filename: `ppc-report-${dateRange.from.toISOString().slice(0, 10)}.pdf`,
        orientation: "landscape",
        header: `PPC Optimizer Report | Period: ${dateRange.label}`,
      });
    } catch (e) {
      alert("PDF failed: " + e);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">PPC Optimizer</h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Monitor, diagnose, and optimize Amazon Sponsored Ads campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Days selector */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-colors",
                  days === d
                    ? "bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]"
                    : "text-[#94A3B8] hover:text-[#64748B]"
                )}
              >
                {d}D
              </button>
            ))}
          </div>
          <button
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-xs font-semibold text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            {[
              {
                label: "Total Ad Spend",
                value: FMT(totalSpend),
                sub: `Last ${days} days`,
                icon: DollarSign,
                iconBg: "#EFF6FF",
                iconColor: "#2563EB",
                badge: null,
                up: true,
              },
              {
                label: "Blended ACoS",
                value: `${blendedAcos}%`,
                sub: "Total spend / total sales",
                icon: Target,
                iconBg: parseFloat(blendedAcos) > 25 ? "#FFF1F2" : "#F0FDF4",
                iconColor: parseFloat(blendedAcos) > 25 ? "#EF4444" : "#10B981",
                badge: null,
                up: parseFloat(blendedAcos) <= 25,
              },
              {
                label: "Total Ad Orders",
                value: totalOrders.toLocaleString(),
                sub: totalOrders > 0
                  ? `${FMT_DECIMAL(totalSales / totalOrders)} avg order value`
                  : "No orders yet",
                icon: TrendingUp,
                iconBg: "#FDF4FF",
                iconColor: "#9333EA",
                badge: null,
                up: true,
              },
              {
                label: "Identified Waste",
                value: FMT(totalWaste),
                sub: `${wastedKeywords.length} zero-order term${wastedKeywords.length !== 1 ? "s" : ""}`,
                icon: AlertTriangle,
                iconBg: "#FFF1F2",
                iconColor: "#EF4444",
                badge: wastedKeywords.length > 0 ? "Action needed" : "Clean",
                up: wastedKeywords.length === 0,
              },
            ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, badge, up }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: iconBg }}>
                    <Icon size={17} style={{ color: iconColor }} />
                  </div>
                  {badge !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                        up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                      )}
                    >
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-0.5 tabular-nums">{value}</p>
                <p className="text-xs text-[#CBD5E1] mt-1">{sub}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Wasted Spend Banner — only when there is waste */}
      {!loading && wastedKeywords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-4">
          <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              {FMT(totalWaste)} in wasted ad spend identified (last {days} days)
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {wastedKeywords.length} search term{wastedKeywords.length !== 1 ? "s" : ""} with zero orders. See the Wasted Keywords section below to take action.
            </p>
          </div>
        </div>
      )}

      {/* Campaign Table */}
      <div ref={reportRef} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Campaign Performance</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">Click any row to view campaign details</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Campaign
                </th>
                <SortTh label="Spend"   col="ad_spend"  active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Sales"   col="ad_sales"  active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="ACoS"    col="acos"      active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="ROAS"    col="roas"      active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Orders"  col="ad_orders" active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="CTR"     col="ctr"       active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="CVR"     col="cvr"       active={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                        <Upload size={24} className="text-[#94A3B8]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">No campaign data yet</p>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Upload a Sponsored Ads report to see campaign performance
                        </p>
                      </div>
                      <Link
                        href="/dashboard/data-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#2563EB" }}
                      >
                        <Upload size={14} />
                        Upload a Sponsored Ads report to see campaign data
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((c, idx) => {
                  const s = STATUS_MAP[c.status];
                  const StatusIcon = s.Icon;
                  const acosColor =
                    c.acos > 25
                      ? "text-red-500"
                      : c.acos >= 15
                      ? "text-amber-600"
                      : "text-emerald-600";
                  return (
                    <tr
                      key={`${c.campaign_name}-${idx}`}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer transition-all duration-100 hover:bg-[#EFF6FF] hover:shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Target size={13} className="text-[#CBD5E1] shrink-0" />
                          <span className="font-medium text-[#0F172A] text-sm leading-tight">
                            {c.campaign_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-medium text-[#334155]">
                        {FMT(c.ad_spend)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-medium text-[#334155]">
                        {FMT(c.ad_sales)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className={cn("text-xs font-bold tabular-nums", acosColor)}>
                            {c.acos.toFixed(1)}%
                          </span>
                          <AcosBar acos={c.acos} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-semibold text-[#0F172A]">
                        {c.roas.toFixed(1)}x
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-[#334155]">{c.ad_orders}</td>
                      <td className="px-4 py-3.5 tabular-nums text-[#64748B]">{c.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3.5 tabular-nums text-[#64748B]">{c.cvr.toFixed(1)}%</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={s.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon size={11} />
                          {s.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && campaigns.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <span className="text-xs text-[#94A3B8]">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} · Last {days} days
            </span>
            <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
              <span>
                Total Spend: <strong className="text-[#0F172A]">{FMT(totalSpend)}</strong>
              </span>
              <span>
                Total Sales: <strong className="text-[#0F172A]">{FMT(totalSales)}</strong>
              </span>
              <span>
                Blended ACoS:{" "}
                <strong
                  className={
                    parseFloat(blendedAcos) > 25 ? "text-red-500" : "text-emerald-600"
                  }
                >
                  {blendedAcos}%
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Wasted Keywords Section */}
      {!loading && wastedKeywords.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Wasted Keywords</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Search terms with spend but zero orders — add as negatives to stop the bleed
            </p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {wastedKeywords.map((kw, i) => (
              <div
                key={`${kw.term}-${i}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-[#FFF1F2] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] font-mono truncate">
                    {kw.term}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {FMT_DECIMAL(kw.spend)} spent · {kw.clicks} click{kw.clicks !== 1 ? "s" : ""} · 0 orders
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-[#94A3B8]">Wasted spend</p>
                    <p className="text-sm font-bold text-red-500 tabular-nums">
                      {FMT_DECIMAL(kw.spend)}
                    </p>
                  </div>
                  <Badge variant="danger" className="text-[11px]">
                    Add Negative
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
            <span className="text-xs text-[#94A3B8]">
              {wastedKeywords.length} term{wastedKeywords.length !== 1 ? "s" : ""} ·{" "}
              <strong className="text-red-500">{FMT(totalWaste)} total wasted spend</strong>
            </span>
          </div>
        </div>
      )}

      {/* Campaign Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent width={580}>
          {selected && (
            <>
              <SheetHeader>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "h-1 rounded-full mb-3 w-16",
                      selected.status === "healthy"
                        ? "bg-emerald-500"
                        : selected.status === "warning"
                        ? "bg-amber-500"
                        : selected.status === "critical"
                        ? "bg-red-500"
                        : "bg-slate-400"
                    )}
                  />
                  <SheetTitle>{selected.campaign_name}</SheetTitle>
                  <SheetDescription>
                    ACoS {selected.acos.toFixed(1)}%
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    ROAS {selected.roas.toFixed(1)}x
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    {selected.ad_orders} orders
                  </SheetDescription>
                </div>
                <SheetCloseButton />
              </SheetHeader>

              <SheetBody>
                {/* Stats grid */}
                <section>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Spend",       value: FMT(selected.ad_spend) },
                      { label: "Sales",       value: FMT(selected.ad_sales) },
                      { label: "ROAS",        value: `${selected.roas.toFixed(1)}x` },
                      { label: "Orders",      value: selected.ad_orders.toString() },
                      { label: "Impressions", value: FMT_K(selected.impressions) },
                      { label: "Clicks",      value: selected.clicks.toLocaleString() },
                      { label: "CTR",         value: `${selected.ctr.toFixed(2)}%` },
                      { label: "CVR",         value: `${selected.cvr.toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5"
                      >
                        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-[#0F172A] tabular-nums mt-0.5">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* ACoS indicator */}
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#64748B]">ACoS Benchmark</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Good: &lt;15%
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          Watch: 15-25%
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          High: &gt;25%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${Math.min((selected.acos / 50) * 100, 100)}%`,
                          backgroundColor:
                            selected.acos > 25
                              ? "#EF4444"
                              : selected.acos >= 15
                              ? "#F59E0B"
                              : "#10B981",
                        }}
                      />
                      {/* 15% marker */}
                      <div
                        className="absolute inset-y-0 w-px bg-amber-400 opacity-60"
                        style={{ left: "30%" }}
                      />
                      {/* 25% marker */}
                      <div
                        className="absolute inset-y-0 w-px bg-red-400 opacity-60"
                        style={{ left: "50%" }}
                      />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1.5">
                      {selected.acos < 15
                        ? `${selected.acos.toFixed(1)}% ACoS — strong performance, consider scaling budget`
                        : selected.acos <= 25
                        ? `${selected.acos.toFixed(1)}% ACoS — moderate, monitor and optimize search terms`
                        : `${selected.acos.toFixed(1)}% ACoS — above 25% threshold, review bids and negatives`}
                    </p>
                  </div>

                  {/* CPC info */}
                  <div className="mt-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide">
                        Cost Per Click
                      </p>
                      <p className="text-lg font-bold text-[#0F172A] tabular-nums mt-0.5">
                        {FMT_DECIMAL(selected.cpc)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide">
                        Status
                      </p>
                      <Badge
                        variant={STATUS_MAP[selected.status].variant}
                        className="flex items-center gap-1 mt-0.5"
                      >
                        {(() => {
                          const S = STATUS_MAP[selected.status];
                          return (
                            <>
                              <S.Icon size={11} />
                              {S.label}
                            </>
                          );
                        })()}
                      </Badge>
                    </div>
                  </div>
                </section>
              </SheetBody>

              <SheetFooter>
                <Button variant="outline" size="md" className="flex-1" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <PdfDateRangeModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={downloadPdf}
        reportName="PPC Optimizer"
      />
    </div>
  );
}

// ── SortTh ─────────────────────────────────────────────────────────────────

function SortTh({
  label,
  col,
  active,
  dir,
  onSort,
}: {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const isActive = active === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-[#0F172A]",
        isActive ? "text-[#2563EB]" : "text-[#94A3B8]"
      )}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          dir === "desc" ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronUp size={13} />
          )
        ) : (
          <ChevronsUpDown size={12} className="opacity-40" />
        )}
      </span>
    </th>
  );
}
