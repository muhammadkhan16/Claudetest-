"use client";

import { useState, useRef } from "react";
import {
  ClipboardList, CheckCircle2, XCircle, AlertTriangle, User,
  Search, Download, Plus, RefreshCw, Calendar, TrendingUp,
  TrendingDown, Target, ShoppingBag, AlertCircle, X,
  BarChart2, FileText, Filter,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetCloseButton, SheetBody, SheetFooter,
} from "@/components/ui/sheet";

interface Client {
  name: string;
  account: string;
  score: number;
  issues: number;
  status: "good" | "warning" | "critical";
  lastAudit: string;
  revenue: string;
  acos: string;
  orders: number;
  category: string;
  checks: { check: string; passed: boolean; detail?: string }[];
  recommendations: string[];
}

const clients: Client[] = [
  {
    name: "TechGadgets LLC",
    account: "A1B2C3D4",
    score: 87,
    issues: 2,
    status: "good",
    lastAudit: "Mar 8, 2026",
    revenue: "$142,500",
    acos: "14.2%",
    orders: 1842,
    category: "Electronics",
    checks: [
      { check: "Listing completeness (title, bullets, images)", passed: true },
      { check: "A+ Content / Brand Story active", passed: true },
      { check: "Price competitiveness within 5% of Buy Box", passed: false, detail: "3 SKUs are 8–12% above competitors" },
      { check: "Review velocity ≥ 1 review/week", passed: true },
      { check: "Inventory health — no stockouts in 30 days", passed: true },
      { check: "PPC ACoS below category benchmark", passed: true },
      { check: "Negative keyword list updated this month", passed: false, detail: "Last updated 47 days ago" },
    ],
    recommendations: [
      "Reprice 3 SKUs: reduce by 5–8% to recapture Buy Box",
      "Update negative keyword lists — 47 days overdue",
      "Consider Sponsored Brand video campaigns for top ASINs",
    ],
  },
  {
    name: "HomeDecor Co",
    account: "E5F6G7H8",
    score: 61,
    issues: 7,
    status: "warning",
    lastAudit: "Mar 5, 2026",
    revenue: "$78,200",
    acos: "28.7%",
    orders: 934,
    category: "Home & Garden",
    checks: [
      { check: "Listing completeness (title, bullets, images)", passed: false, detail: "4 listings missing 2+ images" },
      { check: "A+ Content / Brand Story active", passed: false, detail: "Only 2/15 ASINs have A+ Content" },
      { check: "Price competitiveness within 5% of Buy Box", passed: false, detail: "7 SKUs lost Buy Box" },
      { check: "Review velocity ≥ 1 review/week", passed: true },
      { check: "Inventory health — no stockouts in 30 days", passed: false, detail: "2 top sellers out of stock" },
      { check: "PPC ACoS below category benchmark", passed: false, detail: "ACoS 28.7% vs 22% benchmark" },
      { check: "Negative keyword list updated this month", passed: false, detail: "Never updated since launch" },
    ],
    recommendations: [
      "Urgent: Restock 2 OOS top sellers to prevent ranking loss",
      "Add A+ Content to top 5 ASINs — avg +15% CVR lift",
      "Pause 3 bleeding PPC campaigns immediately",
      "Complete listing images for 4 incomplete products",
      "Reduce bids on 12 high-spend zero-order keywords",
    ],
  },
  {
    name: "SportsPro Inc",
    account: "I9J0K1L2",
    score: 94,
    issues: 1,
    status: "good",
    lastAudit: "Mar 9, 2026",
    revenue: "$315,800",
    acos: "11.3%",
    orders: 4210,
    category: "Sports & Outdoors",
    checks: [
      { check: "Listing completeness (title, bullets, images)", passed: true },
      { check: "A+ Content / Brand Story active", passed: true },
      { check: "Price competitiveness within 5% of Buy Box", passed: true },
      { check: "Review velocity ≥ 1 review/week", passed: true },
      { check: "Inventory health — no stockouts in 30 days", passed: true },
      { check: "PPC ACoS below category benchmark", passed: true },
      { check: "Negative keyword list updated this month", passed: false, detail: "Last updated 32 days ago" },
    ],
    recommendations: [
      "Scale Sponsored Brand campaigns — strong brand equity",
      "Update negative keyword lists (minor, low priority)",
    ],
  },
  {
    name: "BeautyBox Brand",
    account: "M3N4O5P6",
    score: 44,
    issues: 12,
    status: "critical",
    lastAudit: "Feb 28, 2026",
    revenue: "$34,100",
    acos: "52.4%",
    orders: 312,
    category: "Beauty",
    checks: [
      { check: "Listing completeness (title, bullets, images)", passed: false, detail: "All 8 ASINs need image updates" },
      { check: "A+ Content / Brand Story active", passed: false, detail: "No A+ Content on any listing" },
      { check: "Price competitiveness within 5% of Buy Box", passed: false, detail: "All SKUs significantly overpriced" },
      { check: "Review velocity ≥ 1 review/week", passed: false, detail: "0.2 reviews/week average" },
      { check: "Inventory health — no stockouts in 30 days", passed: false, detail: "3 ASINs out of stock >14 days" },
      { check: "PPC ACoS below category benchmark", passed: false, detail: "ACoS 52% vs 28% benchmark" },
      { check: "Negative keyword list updated this month", passed: false, detail: "No negative keywords configured" },
    ],
    recommendations: [
      "CRITICAL: Pause all PPC immediately — ACoS 52% is unsustainable",
      "Restock 3 OOS ASINs — losing organic rank daily",
      "Complete full listing overhaul before re-launching ads",
      "Request reviews via Request a Review tool for all orders",
      "Consider pricing audit — all SKUs priced above market",
      "Enroll in Brand Registry to access A+ Content",
    ],
  },
  {
    name: "FoodFresh Store",
    account: "Q7R8S9T0",
    score: 78,
    issues: 4,
    status: "warning",
    lastAudit: "Mar 7, 2026",
    revenue: "$91,400",
    acos: "19.8%",
    orders: 2847,
    category: "Grocery",
    checks: [
      { check: "Listing completeness (title, bullets, images)", passed: true },
      { check: "A+ Content / Brand Story active", passed: true },
      { check: "Price competitiveness within 5% of Buy Box", passed: false, detail: "2 SKUs losing Buy Box to competitors" },
      { check: "Review velocity ≥ 1 review/week", passed: true },
      { check: "Inventory health — no stockouts in 30 days", passed: false, detail: "Seasonal item ran OOS 8 days" },
      { check: "PPC ACoS below category benchmark", passed: false, detail: "ACoS slightly above 18% benchmark" },
      { check: "Negative keyword list updated this month", passed: false, detail: "Updated 28 days ago" },
    ],
    recommendations: [
      "Reprice 2 SKUs to recapture Buy Box",
      "Increase inventory buffer for seasonal items",
      "Optimize PPC bids to bring ACoS to 18% target",
    ],
  },
];

const statusConfig = {
  good:     { icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200", label: "Good",     barColor: "#10B981" },
  warning:  { icon: AlertTriangle, color: "text-amber-700",   bg: "bg-amber-50  border border-amber-200",   label: "Warning",  barColor: "#F59E0B" },
  critical: { icon: XCircle,       color: "text-red-700",     bg: "bg-red-50    border border-red-200",      label: "Critical", barColor: "#EF4444" },
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
};

type FilterStatus = "all" | "good" | "warning" | "critical";

export default function ClientAuditPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [runningAudit, setRunningAudit] = useState(false);
  const [auditDone, setAuditDone] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.account.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function runAudit() {
    setRunningAudit(true);
    await new Promise((r) => setTimeout(r, 2200));
    setRunningAudit(false);
    setAuditDone(true);
    setTimeout(() => setAuditDone(false), 3000);
  }

  async function downloadPdf() {
    if (!reportRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`client-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("PDF generation failed: " + e);
    }
  }

  async function downloadClientReport(client: Client) {
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
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

      // Client Info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(client.name, 15, y);
      y += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Account: ${client.account}  |  Category: ${client.category}  |  Last Audit: ${client.lastAudit}`, 15, y);
      y += 12;

      // Score
      const scoreNum = client.score;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(scoreNum >= 80 ? 16 : scoreNum >= 60 ? 245 : 239, scoreNum >= 80 ? 185 : scoreNum >= 60 ? 158 : 68, scoreNum >= 80 ? 129 : scoreNum >= 60 ? 11 : 68);
      pdf.text(`Health Score: ${client.score}/100 — ${client.status.toUpperCase()}`, 15, y);
      y += 12;

      // Metrics
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Metrics", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Revenue: ${client.revenue}  |  ACoS: ${client.acos}  |  Orders: ${client.orders.toLocaleString()}`, 15, y);
      y += 14;

      // Checklist
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Audit Checklist", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      for (const item of client.checks) {
        pdf.setTextColor(item.passed ? 16 : 239, item.passed ? 185 : 68, item.passed ? 129 : 68);
        pdf.text(`${item.passed ? "✓" : "✗"} ${item.check}`, 18, y);
        if (!item.passed && item.detail) {
          pdf.setTextColor(148, 163, 184);
          pdf.text(`   → ${item.detail}`, 22, y + 4);
          y += 4;
        }
        y += 7;
      }
      y += 5;

      // Recommendations
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Recommendations", 15, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 64, 175);
      client.recommendations.forEach((rec, i) => {
        pdf.text(`${i + 1}. ${rec}`, 18, y);
        y += 7;
      });

      pdf.save(`audit-report-${client.account}.pdf`);
    } catch (e) {
      alert("PDF generation failed: " + e);
    }
  }

  const totalIssues = clients.reduce((sum, c) => sum + c.issues, 0);
  const avgScore = Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length);
  const criticalCount = clients.filter((c) => c.status === "critical").length;

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
            onClick={downloadPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length, icon: User, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Avg Health Score", value: `${avgScore}/100`, icon: BarChart2, color: "#10B981", bg: "#ECFDF5" },
          { label: "Total Issues", value: totalIssues, icon: AlertCircle, color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Critical Clients", value: criticalCount, icon: XCircle, color: "#EF4444", bg: "#FEF2F2" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
          </div>
        ))}
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
        <button
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
        >
          <Plus size={14} />
          Add Client
        </button>
      </div>

      {/* Client Cards */}
      <div ref={reportRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => {
          const s = statusConfig[client.status];
          const Icon = s.icon;
          return (
            <div
              key={client.account}
              onClick={() => setSelectedClient(client)}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md hover:border-[#BFDBFE] transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                    <User size={15} className="text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{client.name}</p>
                    <p className="text-xs text-[#94A3B8] font-mono">{client.account}</p>
                  </div>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(client.score)}`}>
                  {client.score}
                </span>
              </div>

              {/* Category + Revenue Row */}
              <div className="flex items-center gap-3 mb-3 text-xs text-[#64748B]">
                <span className="bg-[#F1F5F9] px-2 py-0.5 rounded font-medium">{client.category}</span>
                <span>{client.revenue}</span>
                <span className="ml-auto font-mono">{client.acos} ACoS</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                  <Icon size={11} />
                  {s.label}
                </span>
                <div className="text-right">
                  <p className="text-xs text-[#64748B]">{client.issues} issue{client.issues !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-[#94A3B8]">
                    <Calendar size={10} className="inline mr-0.5" />
                    {client.lastAudit}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${client.score}%`, backgroundColor: s.barColor }}
                />
              </div>

              <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-[#2563EB] font-medium">View full audit →</span>
                <span className="text-xs text-[#94A3B8]">{client.orders.toLocaleString()} orders</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-sm">
            <Search size={24} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#64748B]">No clients match your search</p>
            <p className="text-xs text-[#94A3B8] mt-1">Try a different search term or filter</p>
          </div>
        )}
      </div>

      {/* Standard Checklist (overview) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} style={{ color: "#2563EB" }} />
            <h3 className="text-sm font-semibold text-[#0F172A]">Standard Audit Checklist</h3>
          </div>
          <span className="text-xs text-[#94A3B8]">Applies to all clients</span>
        </div>
        <ul className="divide-y divide-[#F1F5F9]">
          {clients[0].checks.map(({ check, passed }) => (
            <li key={check} className="flex items-center gap-4 px-6 py-3 hover:bg-[#F8FAFC] transition-colors">
              {passed ? (
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <XCircle size={15} className="text-[#CBD5E1] shrink-0" />
              )}
              <span className={`text-sm flex-1 ${passed ? "text-[#334155]" : "text-[#CBD5E1] line-through"}`}>
                {check}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {passed ? "Pass" : "Fail"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent width={600}>
          {selectedClient && (() => {
            const s = statusConfig[selectedClient.status];
            const SIcon = s.icon;
            const passedChecks = selectedClient.checks.filter((c) => c.passed).length;
            const totalChecks = selectedClient.checks.length;

            return (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                        <User size={18} className="text-[#2563EB]" />
                      </div>
                      <div>
                        <SheetTitle>{selectedClient.name}</SheetTitle>
                        <p className="text-xs text-[#94A3B8] font-mono">{selectedClient.account} · {selectedClient.category}</p>
                      </div>
                    </div>
                    <SheetCloseButton />
                  </div>
                </SheetHeader>

                <SheetBody>
                  {/* Score + Status */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${scoreColor(selectedClient.score)}`}>
                        {selectedClient.score}
                      </div>
                      <div className="text-xs text-[#94A3B8]">Health Score</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                          <SIcon size={11} />
                          {s.label}
                        </span>
                        <span className="text-xs text-[#94A3B8]">{passedChecks}/{totalChecks} checks passed</span>
                      </div>
                      <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${selectedClient.score}%`, backgroundColor: s.barColor }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Revenue", value: selectedClient.revenue, icon: TrendingUp, color: "#10B981" },
                      { label: "ACoS", value: selectedClient.acos, icon: Target, color: parseFloat(selectedClient.acos) > 25 ? "#EF4444" : "#F59E0B" },
                      { label: "Orders", value: selectedClient.orders.toLocaleString(), icon: ShoppingBag, color: "#2563EB" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-[#F8FAFC] rounded-lg p-3 text-center border border-[#E2E8F0]">
                        <Icon size={14} style={{ color }} className="mx-auto mb-1" />
                        <div className="text-base font-bold text-[#0F172A]">{value}</div>
                        <div className="text-[10px] text-[#94A3B8]">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Audit Checklist */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList size={14} className="text-[#2563EB]" />
                      <h4 className="text-sm font-semibold text-[#0F172A]">Audit Checklist</h4>
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                      <ul className="divide-y divide-[#F1F5F9]">
                        {selectedClient.checks.map(({ check, passed, detail }) => (
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
                            {!passed && detail && (
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
                      <h4 className="text-sm font-semibold text-[#0F172A]">Recommendations</h4>
                      <span className="ml-auto text-xs bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full font-medium">
                        {selectedClient.recommendations.length} actions
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedClient.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                            rec.startsWith("CRITICAL") || rec.startsWith("Urgent")
                              ? "bg-red-50 border-red-200"
                              : "bg-[#F8FAFC] border-[#E2E8F0]"
                          }`}
                        >
                          <span className={`text-xs font-bold shrink-0 ${
                            rec.startsWith("CRITICAL") || rec.startsWith("Urgent")
                              ? "text-red-600"
                              : "text-[#2563EB]"
                          }`}>
                            {i + 1}
                          </span>
                          <p className={`text-xs ${
                            rec.startsWith("CRITICAL") || rec.startsWith("Urgent")
                              ? "text-red-700 font-medium"
                              : "text-[#374151]"
                          }`}>
                            {rec}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-xs text-[#94A3B8]">
                    <Calendar size={11} />
                    <span>Last audited: {selectedClient.lastAudit}</span>
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
    </div>
  );
}
