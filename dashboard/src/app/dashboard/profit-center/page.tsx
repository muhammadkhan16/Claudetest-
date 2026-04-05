"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, ShoppingCart, MousePointerClick, Award,
  ChevronUp, ChevronDown, ChevronsUpDown, Download,
  UploadCloud, Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetCloseButton, SheetBody,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ingestedApi, type IngestedProduct } from "@/lib/api";
import { localStore } from "@/lib/local-store";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "revenue" | "units_ordered" | "sessions" | "unit_session_pct" | "buy_box_pct";
type SortDir = "asc" | "desc";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toFixed(2)}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
        <div className="h-9 w-9 bg-[#E2E8F0] rounded-lg" />
      </div>
      <div className="h-7 w-24 bg-[#E2E8F0] rounded" />
      <div className="h-3 w-36 bg-[#E2E8F0] rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[80, 160, 80, 60, 70, 60, 60, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#E2E8F0] rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Sort icon ──────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="text-[#CBD5E1]" />;
  return sortDir === "desc"
    ? <ChevronDown size={13} className="text-[#2563EB]" />
    : <ChevronUp size={13} className="text-[#2563EB]" />;
}

// ── Share bar ─────────────────────────────────────────────────────────────────

function ShareBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2563EB]"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-[#64748B]">{fmtPct(pct)}</span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#64748B]">{label}</span>
        <span className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: iconBg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </span>
      </div>
      <p className="text-2xl font-bold text-[#0F172A] tracking-tight">{value}</p>
      <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>
    </div>
  );
}

// ── Stat row in sheet ─────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-sm font-semibold text-[#0F172A]">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CLIENT_ID = 1;
const DAY_OPTIONS = [30, 60, 90] as const;
type Days = (typeof DAY_OPTIONS)[number];

export default function ProfitCenterPage() {
  const printRef = useRef<HTMLDivElement>(null);

  // data state
  const [products, setProducts] = useState<IngestedProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // controls
  const [days, setDays]         = useState<Days>(30);
  const [sortKey, setSortKey]   = useState<SortKey>("revenue");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  // sheet
  const [selected, setSelected] = useState<IngestedProduct | null>(null);

  // PDF modal
  const [pdfOpen, setPdfOpen]   = useState(false);

  // fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ingestedApi.getProducts(CLIENT_ID, days);
      if (data.length > 0) {
        setProducts(data);
      } else if (localStore.hasData()) {
        setProducts(localStore.getProducts() as typeof data);
      }
    } catch {
      // API unavailable — try localStorage
      if (localStore.hasData()) {
        setProducts(localStore.getProducts() as ReturnType<typeof ingestedApi.getProducts> extends Promise<infer T> ? T : never);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
    const onBrandChange = () => fetchData();
    window.addEventListener("amzsuite:brand-change", onBrandChange);
    return () => window.removeEventListener("amzsuite:brand-change", onBrandChange);
  }, [fetchData]);

  // KPI derived values
  const kpis = useMemo(() => {
    if (!products.length) return null;
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalUnits   = products.reduce((s, p) => s + p.units_ordered, 0);
    const avgCvr       = products.reduce((s, p) => s + p.unit_session_pct, 0) / products.length;
    const avgBuyBox    = products.reduce((s, p) => s + p.buy_box_pct, 0) / products.length;
    return { totalRevenue, totalUnits, avgCvr, avgBuyBox };
  }, [products]);

  // sorted table rows
  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [products, sortKey, sortDir]);

  // column sort toggle
  function toggleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  // PDF export
  async function handlePdfConfirm(range: { label: string; from: Date; to: Date }) {
    setPdfOpen(false);
    if (!printRef.current) return;
    await captureToPdf(printRef.current, {
      filename: `profit-center-${range.label.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      orientation: "landscape",
      header: `Profit Center — ${range.label}`,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div ref={printRef} className="space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Profit Center</h1>
            <p className="text-sm text-[#64748B] mt-0.5">Product performance from uploaded Business Reports</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Days selector */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
              {DAY_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    days === d
                      ? "bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  {d}D
                </button>
              ))}
            </div>

            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfOpen(true)}
              className="gap-2 border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
            >
              <Download size={14} />
              Export PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={fmt$(kpis.totalRevenue)}
              sub={`across ${products.length} products`}
              icon={DollarSign}
              iconBg="#EFF6FF"
              iconColor="#2563EB"
            />
            <KpiCard
              label="Total Units Sold"
              value={fmtNum(kpis.totalUnits)}
              sub="units ordered"
              icon={ShoppingCart}
              iconBg="#F0FDF4"
              iconColor="#10B981"
            />
            <KpiCard
              label="Avg Conversion Rate"
              value={fmtPct(kpis.avgCvr)}
              sub="unit session %"
              icon={MousePointerClick}
              iconBg="#FFF7ED"
              iconColor="#F59E0B"
            />
            <KpiCard
              label="Buy Box %"
              value={fmtPct(kpis.avgBuyBox)}
              sub="avg across products"
              icon={Award}
              iconBg="#F0FDF4"
              iconColor="#10B981"
            />
          </div>
        ) : null}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Product Performance</h2>
            {!loading && products.length > 0 && (
              <span className="text-xs text-[#94A3B8]">{products.length} products · last {days} days</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  {/* Non-sortable */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                    ASIN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                    Product
                  </th>
                  {/* Sortable columns */}
                  {(
                    [
                      ["revenue",          "Revenue"],
                      ["units_ordered",    "Units"],
                      ["sessions",         "Sessions"],
                      ["unit_session_pct", "CVR%"],
                      ["buy_box_pct",      "Buy Box%"],
                    ] as [SortKey, string][]
                  ).map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-[#0F172A] select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                    Share
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  [0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)
                ) : sorted.length === 0 ? null : (
                  sorted.map(p => (
                    <tr
                      key={p.asin}
                      onClick={() => setSelected(p)}
                      className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {p.asin}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="text-[#0F172A] font-medium line-clamp-1" title={p.title}>
                          {p.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#0F172A] font-semibold">{fmt$(p.revenue)}</td>
                      <td className="px-4 py-3 text-[#374151]">{fmtNum(p.units_ordered)}</td>
                      <td className="px-4 py-3 text-[#374151]">{fmtNum(p.sessions)}</td>
                      <td className="px-4 py-3 text-[#374151]">{fmtPct(p.unit_session_pct)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            p.buy_box_pct >= 90
                              ? "text-[#10B981]"
                              : p.buy_box_pct >= 70
                              ? "text-[#F59E0B]"
                              : "text-[#EF4444]"
                          )}
                        >
                          {fmtPct(p.buy_box_pct)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ShareBar pct={p.share_pct} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && sorted.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-4">
                <Package size={22} className="text-[#94A3B8]" />
              </div>
              <p className="text-sm font-semibold text-[#0F172A] mb-1">No product data yet</p>
              <p className="text-sm text-[#94A3B8] mb-4 max-w-xs">
                Upload an Amazon Business Report to see product performance metrics here.
              </p>
              <Link href="/dashboard/data-upload">
                <Button variant="outline" size="sm" className="gap-2 border-[#E2E8F0]">
                  <UploadCloud size={14} />
                  Upload a Business Report to see product performance
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Data notice */}
        {!loading && products.length > 0 && (
          <p className="text-xs text-[#94A3B8] text-center">
            Data sourced from Amazon Business Report CSVs. COGS, FBA fees, and refund data are not included in Amazon exports and are not shown.
          </p>
        )}
      </div>

      {/* Product detail sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent width={480}>
          <SheetHeader>
            <div>
              <SheetTitle>{selected?.title ?? ""}</SheetTitle>
              <p className="text-xs text-[#94A3B8] mt-1 font-mono">{selected?.asin}</p>
            </div>
            <SheetCloseButton />
          </SheetHeader>

          {selected && (
            <SheetBody>
              {/* Stats */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] px-4 divide-y divide-[#F1F5F9]">
                <StatRow label="Revenue"          value={fmt$(selected.revenue)} />
                <StatRow label="Units Ordered"    value={fmtNum(selected.units_ordered)} />
                <StatRow label="Sessions"         value={fmtNum(selected.sessions)} />
                <StatRow label="Page Views"       value={fmtNum(selected.page_views)} />
                <StatRow label="Conversion Rate"  value={fmtPct(selected.unit_session_pct)} />
                <StatRow label="Buy Box %"        value={fmtPct(selected.buy_box_pct)} />
                <StatRow label="Revenue Share"    value={fmtPct(selected.share_pct)} />
              </div>

              {/* Buy box health */}
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Buy Box Health</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        selected.buy_box_pct >= 90 ? "bg-[#10B981]"
                          : selected.buy_box_pct >= 70 ? "bg-[#F59E0B]"
                          : "bg-[#EF4444]"
                      )}
                      style={{ width: `${Math.min(selected.buy_box_pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">{fmtPct(selected.buy_box_pct)}</span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-2">
                  {selected.buy_box_pct >= 90
                    ? "Strong buy box ownership."
                    : selected.buy_box_pct >= 70
                    ? "Moderate buy box ownership — monitor for competitors."
                    : "Low buy box ownership — investigate pricing or eligibility."}
                </p>
              </div>

              {/* Notice about missing data */}
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
                <p className="text-xs text-[#92400E] font-medium mb-0.5">Profitability data not available</p>
                <p className="text-xs text-[#B45309]">
                  COGS, FBA fees, and refund data are not included in Amazon Business Report exports.
                  Connect your cost data to enable margin calculations.
                </p>
              </div>
            </SheetBody>
          )}
        </SheetContent>
      </Sheet>

      {/* PDF date range modal */}
      <PdfDateRangeModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        onConfirm={handlePdfConfirm}
        reportName="Profit Center"
      />
    </>
  );
}
