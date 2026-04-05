"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Clock,
  X, RefreshCw, BarChart2, Target, Search, Trash2,
} from "lucide-react";
import { uploadsApi, clientsApi } from "@/lib/api";
import type { UploadJob } from "@/lib/api";
import type { Client } from "@/lib/types";

const REPORT_TYPES = [
  {
    value: "auto",
    label: "Auto-detect",
    desc: "Let the system detect the report type from headers",
    icon: Search,
  },
  {
    value: "business_report",
    label: "Business Report",
    desc: "Sales, sessions, page views, buy box % per ASIN",
    icon: BarChart2,
  },
  {
    value: "ppc",
    label: "Sponsored Ads Report",
    desc: "Campaign spend, sales, ACoS, clicks, impressions",
    icon: Target,
  },
  {
    value: "search_terms",
    label: "Search Term Report",
    desc: "Customer search terms, clicks, orders per keyword",
    icon: Search,
  },
];

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  pending:    { label: "Pending",    cls: "bg-slate-100 text-slate-600",  dot: "bg-slate-400"  },
  processing: { label: "Processing", cls: "bg-amber-100 text-amber-700",  dot: "bg-amber-400 animate-pulse" },
  completed:  { label: "Completed",  cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  failed:     { label: "Failed",     cls: "bg-red-100 text-red-600",      dot: "bg-red-500"    },
};

const REPORT_LABELS: Record<string, string> = {
  business_report: "Business Report",
  ppc: "Sponsored Ads",
  search_terms: "Search Terms",
};

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DataUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reportType, setReportType] = useState("auto");
  const [clientId, setClientId] = useState<number>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ jobId: number; reportType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load clients for selector
  useEffect(() => {
    clientsApi.getAll().then((list) => {
      setClients(list);
      if (list.length > 0) setClientId(list[0].id);
    }).catch(() => {});
  }, []);

  // Load upload history
  useEffect(() => {
    if (clientId) loadJobs();
  }, [clientId]);

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const data = await uploadsApi.listJobs(clientId);
      setJobs(data);
    } catch {
      // silently fail — backend might not be running
    } finally {
      setLoadingJobs(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".csv") || dropped.name.endsWith(".txt"))) {
      setFile(dropped);
      setError(null);
      setUploadResult(null);
    } else {
      setError("Only CSV files are supported.");
    }
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const type = reportType === "auto" ? undefined : reportType;
      const result = await uploadsApi.upload(file, clientId, type);
      setUploadResult({ jobId: result.jobId, reportType: result.reportType });
      setFile(null);
      // Refresh history after short delay to let backend respond
      setTimeout(() => loadJobs(), 1500);
      setTimeout(() => loadJobs(), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed — is the backend running?");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Upload Amazon Reports</h2>
        <p className="text-sm text-[#94A3B8] mt-1">
          Upload CSV exports from Amazon Seller Central — data will appear across all dashboard pages
        </p>
      </div>

      {/* How-to banner */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-[#1D4ED8] mb-2">Where to download reports from Amazon</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Business Report", path: "Seller Central → Reports → Business Reports → By ASIN", badge: "bg-blue-100 text-blue-700" },
            { label: "Sponsored Ads", path: "Advertising → Campaign Manager → Reports → Download", badge: "bg-purple-100 text-purple-700" },
            { label: "Search Terms", path: "Advertising → Campaign Manager → Reports → Search Term", badge: "bg-emerald-100 text-emerald-700" },
          ].map(({ label, path, badge }) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">{path}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-3 space-y-4">
          {/* Client selector */}
          {clients.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-2">
                Upload for client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.marketplace}</option>
                ))}
              </select>
            </div>
          )}

          {/* Report type selector */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
            <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-3">
              Report type
            </label>
            <div className="space-y-2">
              {REPORT_TYPES.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setReportType(value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    reportType === value
                      ? "border-[#2563EB] bg-[#EFF6FF]"
                      : "border-[#E2E8F0] hover:border-[#BFDBFE]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    reportType === value ? "bg-[#2563EB]" : "bg-[#F1F5F9]"
                  }`}>
                    <Icon size={13} className={reportType === value ? "text-white" : "text-[#94A3B8]"} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${reportType === value ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                  {reportType === value && (
                    <CheckCircle2 size={15} className="text-[#2563EB] ml-auto shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                dragging
                  ? "border-[#2563EB] bg-[#EFF6FF]"
                  : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); setError(null); setUploadResult(null); }
                }}
              />
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FileText size={22} className="text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#0F172A]">{file.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{fmt(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-red-100 text-[#94A3B8] hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                    <Upload size={22} className="text-[#2563EB]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#0F172A]">Drop your CSV here</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">or click to browse · CSV files up to 50 MB</p>
                  </div>
                </>
              )}
            </div>

            {/* Feedback */}
            {error && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {uploadResult && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Upload received — Job #{uploadResult.jobId}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Detected as <strong>{REPORT_LABELS[uploadResult.reportType] ?? uploadResult.reportType}</strong>.
                    Processing in background — refresh the dashboard pages to see updated data.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#2563EB" }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-semibold text-[#0F172A]">Upload History</h3>
              <button
                onClick={loadJobs}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#64748B] transition-colors"
              >
                <RefreshCw size={13} className={loadingJobs ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingJobs && jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <RefreshCw size={18} className="text-[#CBD5E1] animate-spin" />
                <p className="text-xs text-[#CBD5E1]">Loading…</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 px-4 text-center">
                <FileText size={24} className="text-[#CBD5E1]" />
                <p className="text-sm text-[#94A3B8] font-medium">No uploads yet</p>
                <p className="text-xs text-[#CBD5E1]">Your upload history will appear here</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {jobs.map((job) => {
                  const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
                  return (
                    <li key={job.id} className="px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-[#94A3B8] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#0F172A] truncate">{job.filename}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">
                            {REPORT_LABELS[job.report_type] ?? job.report_type} · {timeAgo(job.created_at)}
                          </p>
                          {job.status === "completed" && (
                            <p className="text-[10px] text-emerald-600 mt-0.5">
                              {job.rows_inserted?.toLocaleString()} rows inserted
                            </p>
                          )}
                          {job.status === "failed" && job.error_message && (
                            <p className="text-[10px] text-red-500 mt-0.5 truncate">{job.error_message}</p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
