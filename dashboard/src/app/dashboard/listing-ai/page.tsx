"use client";

import { useState, useRef } from "react";
import { Bot, Sparkles, Copy, CheckCheck, Loader2, Download } from "lucide-react";
import PdfDateRangeModal from "@/components/PdfDateRangeModal";
import { captureToPdf } from "@/lib/pdf";

interface ListingResult {
  score: number;
  estimatedTrafficLift: string;
  title: { current: string; optimized: string };
  description: { current: string; optimized: string };
  bullets: Array<{ current: string; optimized: string }>;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://amazon-dashboard-api.masud-ba7.workers.dev";

export default function ListingAIPage() {
  const [form, setForm] = useState({
    productName: "",
    category: "",
    currentTitle: "",
    currentDescription: "",
    bulletPoints: ["", "", "", "", ""],
    keywords: "",
  });
  const [result, setResult] = useState<ListingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function downloadPdf(dateRange: { label: string; from: Date; to: Date }) {
    if (!reportRef.current || !result) return;
    try {
      await captureToPdf(reportRef.current, {
        filename: `listing-ai-report-${dateRange.from.toISOString().slice(0, 10)}.pdf`,
        orientation: "portrait",
        header: `Listing AI Report | Period: ${dateRange.label}`,
      });
    } catch (e) { alert("PDF failed: " + e); }
  }

  function updateBullet(index: number, value: string) {
    const updated = [...form.bulletPoints];
    updated[index] = value;
    setForm({ ...form, bulletPoints: updated });
  }

  async function handleGenerate() {
    if (!form.productName || !form.currentTitle) {
      setError("Product name and current title are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/listing-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "API error");
      setResult(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Listing AI</h2>
        <p className="text-sm text-[#94A3B8] mt-1">
          AI-powered listing optimization for higher conversion and ranking
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot size={17} style={{ color: "#2563EB" }} />
          <h3 className="text-sm font-semibold text-[#0F172A]">Product Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product Name *">
            <input
              type="text"
              placeholder="e.g. Wireless Earbuds Pro"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <input
              type="text"
              placeholder="e.g. Electronics > Headphones"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Current Title *">
          <input
            type="text"
            placeholder="Your current Amazon title"
            value={form.currentTitle}
            onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="Target Keywords">
          <input
            type="text"
            placeholder="e.g. noise cancelling, bluetooth 5.3, waterproof"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="Current Description">
          <textarea
            rows={3}
            placeholder="Your current product description"
            value={form.currentDescription}
            onChange={(e) => setForm({ ...form, currentDescription: e.target.value })}
            className={inputCls + " resize-none"}
          />
        </Field>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#64748B]">
            Current Bullet Points
          </label>
          {form.bulletPoints.map((b, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Bullet point ${i + 1}`}
              value={b}
              onChange={(e) => updateBullet(i, e.target.value)}
              className={inputCls}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg
                     transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" />Generating...</>
          ) : (
            <><Sparkles size={14} />Generate with AI</>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4" ref={reportRef}>
          {/* Score bar */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2563EB]">{result.score}</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Listing Score</p>
            </div>
            <div className="h-10 w-px bg-[#E2E8F0]" />
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                Estimated Traffic Lift: <span className="text-emerald-600">{result.estimatedTrafficLift}</span>
              </p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Based on keyword integration and copy improvements
              </p>
            </div>
            <button
              onClick={() => setPdfModalOpen(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>

          {/* Title */}
          <ResultCard
            label="Title"
            current={result.title.current}
            optimized={result.title.optimized}
            copyKey="title"
            copied={copied}
            onCopy={handleCopy}
          />

          {/* Description */}
          <ResultCard
            label="Description"
            current={result.description.current}
            optimized={result.description.optimized}
            copyKey="description"
            copied={copied}
            onCopy={handleCopy}
          />

          {/* Bullets */}
          {result.bullets.map((b, i) => (
            <ResultCard
              key={i}
              label={`Bullet Point ${i + 1}`}
              current={b.current}
              optimized={b.optimized}
              copyKey={`bullet-${i}`}
              copied={copied}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
      <PdfDateRangeModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={downloadPdf}
        reportName="Listing AI"
      />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg " +
  "text-[#0F172A] placeholder-[#94A3B8] " +
  "focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#64748B] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ResultCard({
  label,
  current,
  optimized,
  copyKey,
  copied,
  onCopy,
}: {
  label: string;
  current: string;
  optimized: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-md text-white"
          style={{ backgroundColor: "#2563EB" }}
        >
          {label}
        </span>
        <button
          onClick={() => onCopy(optimized, copyKey)}
          className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#0F172A] transition-colors"
        >
          {copied === copyKey ? (
            <><CheckCheck size={13} className="text-emerald-500" /><span className="text-emerald-600 font-medium">Copied!</span></>
          ) : (
            <><Copy size={13} />Copy</>
          )}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3">
          <p className="text-xs font-medium text-[#94A3B8] mb-1.5">Current</p>
          <p className="text-sm text-[#64748B] whitespace-pre-wrap">{current || "—"}</p>
        </div>
        <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3">
          <p className="text-xs font-medium text-[#2563EB] mb-1.5">AI Optimized</p>
          <p className="text-sm text-[#0F172A] whitespace-pre-wrap">{optimized}</p>
        </div>
      </div>
    </div>
  );
}
