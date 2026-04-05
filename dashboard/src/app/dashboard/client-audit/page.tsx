"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList, CheckCircle2, XCircle, AlertTriangle, User,
  Search, Download, RefreshCw, Target, ShoppingBag, AlertCircle,
  BarChart2, FileText, Filter, TrendingUp, Package,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetCloseButton, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";
import { clientsApi } from "@/lib/api";
import type { ClientAudit } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(score: number): "good" | "warning" | "critical" {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "critical";
}

const statusConfig = {
  good:     { icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200", label: "Good",     barColor: "#10B981" },
  warning:  { icon: AlertTriangle, color: "text-amber-700",   bg: "bg-amber-50  border border-amber-200",   label: "Warning",  barColor: "#F59E0B" },
  critical: { icon: XCircle,       color: "text-red-700",     bg: "bg-red-50    border border-red-200",      label: "Critical", barColor: "#EF4444" },
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function acosColor(acos: number) {
  if (acos < 15) return "text-emerald-600";
  if (acos <= 25) return "text-amber-600";
  return "text-red-600";
}

function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function buildChecks(c: ClientAudit) {
  return [
    {
      check: "PPC ACoS below 25%",
      passed: c.acos < 25,
      detail: c.acos >= 25 ? `Current ACoS is ${c.acos.toFixed(1)}%` : `ACoS ${c.acos.toFixed(1)}% — within target`,
    },
    {
      check: "Revenue generating (last 30d)",
      passed: c.revenue_30d > 0,
      detail: c.revenue_30d === 0 ? "No revenue recorded — upload Business Report CSV" : `${fmtCurrency(c.revenue_30d)} earned`,
    },
    {
      check: "Active products listed",
      passed: c.active_products > 0,
      detail: c.active_products === 0 ? "No active products found" : `${c.active_products} active product${c.active_products !== 1 ? "s" : ""}`,
    },
    {
      check: "Orders placed (last 30d)",
      passed: c.orders_30d > 0,
      detail: c.orders_30d === 0 ? "No orders recorded — check listing health" : `${c.orders_30d.toLocaleString()} orders`,
    },
  ];
}

function buildRecommendations(c: ClientAudit): string[] {
  const recs: string[] = [];
  if (c.acos > 30) recs.push("CRITICAL: Review and reduce PPC bids — ACoS exceeds 30%");
  else if (c.acos > 25) recs.push("Optimise PPC campaigns to bring ACoS below 25%");
  else if (c.acos > 0 && c.acos < 10) recs.push("ACoS is very low — consider scaling ad spend to capture more share");
  if (c.revenue_30d === 0) recs.push("Upload Business Report CSV to see revenue data");
  if (c.orders_30d === 0) recs.push("Investigate listing health — no orders in the past 30 days");
  if (c.active_products === 0) recs.push("Ensure products are listed and active in Seller Central");
  if (c.ad_spend_30d === 0) recs.push("No ad spend detected — consider launching PPC campaigns to drive traffic");
  if (c.health_score < 60) recs.push("Schedule a full account review — health score is in the critical range");
  else if (c.health_score < 80) recs.push("Address flagged issues above to move health score above 80");
  if (recs.length === 0) recs.push("Account is performing well — continue monitoring weekly");
  return recs;
}

// ── Skeleton components ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F1F5F9]" />
          <div>
            <div className="h-3.5 w-32 bg-[#F1F5F9] rounded mb-1.5" />
            <div className="h-2.5 w-20 bg-[#F1F5F9] rounded" />
          </div>
        </div>
        <div className="h-7 w-10 bg-[#F1F5F9] rounded" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-[#F1F5F9] rounded" />
        <div className="h-5 w-24 bg-[#F1F5F9] rounded" />
      </div>
      <div className="h-1.5 bg-[#F1F5F9] rounded-full" />
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-24 bg-[#F1F5F9] rounded" />
        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9]" />
      </div>
      <div className="h-7 w-16 bg-[#F1F5F9] rounded" />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterStatus = "all" | "good" | "warning" | "critical";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientAuditPage() {
  const [clients, setClients] = useState<ClientAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedClient, setSelectedClient] = useState<ClientAudit | null>(null);
  const [runningAudit, setRunningAudit] = useState(false);
  const [auditDone, setAuditDone] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const data = await clientsApi.getAudit();
      setClients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load client data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.marketplace.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || getStatus(c.health_score) === filterStatus;
    return matchSearch && matchStatus;
  });

  // KPI aggregates
  const totalClients = clients.length;
  const avgHealthScore = clients.length
    ? Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length)
    : 0;
  const atRiskCount = clients.filter((c) => c.health_score < 60).length;

  async function runAudit() {
    setRunningAudit(true);
    await fetchClients();
    setRunningAudit(false);
    setAuditDone(true);
    setTimeout(() => setAuditDone(false), 3000);
  }

  async function downloadPdf(dateRange: { label: string; from: Date; to: Date }) {
    if (!reportRef.current) return;
    try {
      await captureToPdf(reportRef.current, {
        filename: `client-audit-${dateRange.from.toISOString().slice(0, 10)}.pdf`,
        orientation: "portrait",
        header: `Client Audit Report | Period: ${dateRange.label}`,
      });
    } catch (e) { alert("PDF failed: " + e); }
  }

  async function downloadClientReport(client: ClientAudit) {
    const checks = buildChecks(client);
    const recommendations = buildRecommendations(client);
    const status = getStatus(client.health_score);

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 40, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("AmzSuite Pro — Client Audit Report", 15, 20);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 30);

      let y = 55;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(client.client_name, 15, y);
      y += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Marketplace: ${client.marketplace}  |  Health Score: ${client.health_score}/100  |  Status: ${status.toUpperCase()}`, 15, y);
      y += 12;

      const scoreNum = client.health_score;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(
        scoreNum >= 80 ? 16 : scoreNum >= 60 ? 245 : 239,
        scoreNum >= 80 ? 185 : scoreNum >= 60 ? 158 : 68,
        scoreNum >= 80 ? 129 : scoreNum >= 60 ? 11 : 68,
      );
      pdf.text(`Health Score: ${client.health_score}/100`, 15, y);
      y += 12;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Metrics", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        `Revenue (30d): ${fmtCurrency(client.revenue_30d)}  |  ACoS: ${client.acos.toFixed(1)}%  |  Orders: ${client.orders_30d.toLocaleString()}  |  Active Products: ${client.active_products}`,
        15,
        y,
      );
      y += 14;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Health Checks", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      for (const item of checks) {
        pdf.setTextColor(item.passed ? 16 : 239, item.passed ? 185 : 68, item.passed ? 129 : 68);
        pdf.text(`${item.passed ? "✓" : "✗"} ${item.check}`, 18, y);
        if (item.detail) {
          pdf.setTextColor(148, 163, 184);
          pdf.text(`   → ${item.detail}`, 22, y + 4);
          y += 4;
        }
        y += 7;
      }
      y += 5;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Recommended Actions", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 64, 175);
      recommendations.forEach((rec, i) => {
        pdf.text(`${i + 1}. ${rec}`, 18, y);
        y += 7;
      });

      pdf.save(`audit-report-${client.client_id}.pdf`);
    } catch (e) {
      alert("PDF generation failed: " + e);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Client Audit</h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Account health scores and compliance checks for all clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAudit}
            disabled={runningAudit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#2563EB" }}
          >
            {runningAudit ? (
              <><RefreshCw size={14} className="animate-spin" /> Running Audit...</>
            ) : auditDone ? (
              <><CheckCircle2 size={14} /> Audit Complete!</>
            ) : (
              <><RefreshCw size={14} /> Run Full Audit</>
            )}
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

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <>
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#94A3B8] font-medium">Total Clients</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#EFF6FF]">
                  <User size={15} style={{ color: "#2563EB" }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{totalClients}</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#94A3B8] font-medium">Avg Health Score</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#ECFDF5]">
                  <BarChart2 size={15} style={{ color: "#10B981" }} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${scoreColor(avgHealthScore)}`}>
                {totalClients ? `${avgHealthScore}/100` : "—"}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#94A3B8] font-medium">At Risk</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FEF2F2]">
                  <AlertCircle size={15} style={{ color: "#EF4444" }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
          <Filter size={12} className="text-[#94A3B8] ml-1" />
          {(["all", "good", "warning", "critical"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                filterStatus === f
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchClients}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Client Cards / Skeleton / Empty */}
      <div ref={reportRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : !error && clients.length === 0 ? (
          /* Empty state — no clients at all */
          <div className="col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-16 text-center shadow-sm">
            <ClipboardList size={32} className="text-[#CBD5E1] mx-auto mb-4" />
            <p className="text-base font-semibold text-[#64748B] mb-1">No client data yet</p>
            <p className="text-sm text-[#94A3B8] mb-5">
              Upload client reports to populate the audit dashboard
            </p>
            <Link
              href="/dashboard/data-upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#2563EB" }}
            >
              <Download size={14} />
              Upload client reports
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          /* No results for current search/filter */
          <div className="col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-sm">
            <Search size={24} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#64748B]">No clients match your search</p>
            <p className="text-xs text-[#94A3B8] mt-1">Try a different search term or filter</p>
          </div>
        ) : (
          filtered.map((client) => {
            const status = getStatus(client.health_score);
            const s = statusConfig[status];
            const Icon = s.icon;
            const acosNum = client.acos;

            return (
              <div
                key={client.client_id}
                onClick={() => setSelectedClient(client)}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md hover:border-[#BFDBFE] transition-all cursor-pointer group"
              >
                {/* Name + Score */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                      <User size={15} className="text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{client.client_name}</p>
                      <span className="text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded">
                        {client.marketplace}
                      </span>
                    </div>
                  </div>
                  <span className={`text-2xl font-bold tabular-nums ${scoreColor(client.health_score)}`}>
                    {client.health_score}
                  </span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-[#F8FAFC] rounded-lg p-2">
                    <p className="text-[10px] text-[#94A3B8] mb-0.5">Revenue</p>
                    <p className="text-xs font-semibold text-[#0F172A]">{fmtCurrency(client.revenue_30d)}</p>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-lg p-2">
                    <p className="text-[10px] text-[#94A3B8] mb-0.5">ACoS</p>
                    <p className={`text-xs font-semibold ${acosColor(acosNum)}`}>{acosNum.toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-lg p-2">
                    <p className="text-[10px] text-[#94A3B8] mb-0.5">Orders</p>
                    <p className="text-xs font-semibold text-[#0F172A]">{client.orders_30d.toLocaleString()}</p>
                  </div>
                </div>

                {/* Status badge + products */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                    <Icon size={11} />
                    {s.label}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {client.active_products} active product{client.active_products !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Health bar */}
                <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${client.health_score}%`, backgroundColor: s.barColor }}
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-[#F1F5F9] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-[#2563EB] font-medium">View Details →</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent width={600}>
          {selectedClient && (() => {
            const status = getStatus(selectedClient.health_score);
            const s = statusConfig[status];
            const SIcon = s.icon;
            const checks = buildChecks(selectedClient);
            const recommendations = buildRecommendations(selectedClient);
            const passedChecks = checks.filter((c) => c.passed).length;

            return (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                        <User size={18} className="text-[#2563EB]" />
                      </div>
                      <div>
                        <SheetTitle>{selectedClient.client_name}</SheetTitle>
                        <p className="text-xs text-[#94A3B8]">{selectedClient.marketplace}</p>
                      </div>
                    </div>
                    <SheetCloseButton />
                  </div>
                </SheetHeader>

                <SheetBody>
                  {/* Score + status bar */}
                  <div className="flex items-center gap-4">
                    <div className="text-center shrink-0">
                      <div className={`text-4xl font-bold ${scoreColor(selectedClient.health_score)}`}>
                        {selectedClient.health_score}
                      </div>
                      <div className="text-xs text-[#94A3B8]">Health Score</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                          <SIcon size={11} />
                          {s.label}
                        </span>
                        <span className="text-xs text-[#94A3B8]">{passedChecks}/{checks.length} checks passed</span>
                      </div>
                      <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${selectedClient.health_score}%`, backgroundColor: s.barColor }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Revenue (30d)", value: fmtCurrency(selectedClient.revenue_30d), icon: TrendingUp, color: "#10B981" },
                      { label: "ACoS", value: `${selectedClient.acos.toFixed(1)}%`, icon: Target, color: selectedClient.acos > 25 ? "#EF4444" : selectedClient.acos < 15 ? "#10B981" : "#F59E0B" },
                      { label: "Orders (30d)", value: selectedClient.orders_30d.toLocaleString(), icon: ShoppingBag, color: "#2563EB" },
                      { label: "Active Products", value: selectedClient.active_products.toString(), icon: Package, color: "#8B5CF6" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-[#F8FAFC] rounded-lg p-3 text-center border border-[#E2E8F0]">
                        <Icon size={14} style={{ color }} className="mx-auto mb-1" />
                        <div className="text-base font-bold text-[#0F172A]">{value}</div>
                        <div className="text-[10px] text-[#94A3B8]">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ad spend */}
                  <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-[#64748B] font-medium">Ad Spend (30d)</span>
                    <span className="text-sm font-bold text-[#0F172A]">{fmtCurrency(selectedClient.ad_spend_30d)}</span>
                  </div>

                  {/* Health checks */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList size={14} className="text-[#2563EB]" />
                      <h4 className="text-sm font-semibold text-[#0F172A]">Health Checks</h4>
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                      <ul className="divide-y divide-[#F1F5F9]">
                        {checks.map(({ check, passed, detail }) => (
                          <li key={check} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {passed ? (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle size={14} className="text-red-400 shrink-0" />
                              )}
                              <span className={`text-xs flex-1 ${passed ? "text-[#334155]" : "text-[#64748B]"}`}>
                                {check}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                              }`}>
                                {passed ? "Pass" : "Fail"}
                              </span>
                            </div>
                            {detail && (
                              <p className="text-[10px] text-[#94A3B8] mt-1 ml-6 flex items-center gap-1">
                                <AlertCircle size={9} />
                                {detail}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} className="text-[#2563EB]" />
                      <h4 className="text-sm font-semibold text-[#0F172A]">Recommended Actions</h4>
                      <span className="ml-auto text-xs bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full font-medium">
                        {recommendations.length} action{recommendations.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                            rec.startsWith("CRITICAL")
                              ? "bg-red-50 border-red-200"
                              : "bg-[#F8FAFC] border-[#E2E8F0]"
                          }`}
                        >
                          <span className={`text-xs font-bold shrink-0 ${
                            rec.startsWith("CRITICAL") ? "text-red-600" : "text-[#2563EB]"
                          }`}>
                            {i + 1}
                          </span>
                          <p className={`text-xs ${
                            rec.startsWith("CRITICAL") ? "text-red-700 font-medium" : "text-[#374151]"
                          }`}>
                            {rec}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetBody>

                <SheetFooter>
                  <button
                    onClick={() => downloadClientReport(selectedClient)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    <Download size={14} />
                    Download Report PDF
                  </button>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                  >
                    Close
                  </button>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <PdfDateRangeModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={downloadPdf}
        reportName="Client Audit"
      />
    </div>
  );
}
