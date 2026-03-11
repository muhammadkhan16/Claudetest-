"use client";

import { useState } from "react";
import { Bot, Sparkles, Copy, RefreshCw, CheckCheck } from "lucide-react";

const suggestions = [
  {
    field: "Title",
    original: "Wireless Earbuds with Charging Case",
    optimized:
      "Wireless Earbuds Pro | Active Noise Cancelling, 32H Battery, IPX5 Waterproof | Bluetooth 5.3 Earphones with LED Charging Case",
  },
  {
    field: "Bullet Point 1",
    original: "Good sound quality",
    optimized:
      "SUPERIOR SOUND QUALITY — Engineered with 10mm dynamic drivers and custom EQ tuning to deliver rich bass, crisp highs, and immersive stereo audio for music, calls, and podcasts.",
  },
  {
    field: "Search Terms",
    original: "earbuds wireless bluetooth",
    optimized:
      "wireless earbuds bluetooth noise cancelling earphones true wireless stereo earbuds sport workout earbuds ipx5 waterproof earbuds with mic",
  },
];

export default function ListingAIPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Listing AI</h2>
        <p className="text-sm text-[#94A3B8] mt-1">
          AI-powered listing optimization for higher conversion and ranking
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot size={17} style={{ color: "#2563EB" }} />
          <h3 className="text-sm font-semibold text-[#0F172A]">Generate Optimized Copy</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">Product Name</label>
            <input
              type="text"
              defaultValue="Wireless Earbuds Pro"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg
                         text-[#0F172A] placeholder-[#94A3B8]
                         focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]
                         transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">Target Keywords</label>
            <input
              type="text"
              defaultValue="noise cancelling, bluetooth 5.3, waterproof"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg
                         text-[#0F172A] placeholder-[#94A3B8]
                         focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]
                         transition-colors"
            />
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg
                     transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "#2563EB" }}
        >
          <Sparkles size={14} />
          Generate with AI
        </button>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#64748B]">AI Suggestions</h3>
        {suggestions.map(({ field, original, optimized }) => (
          <div key={field} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3
                                      shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-md text-white"
                style={{ backgroundColor: "#2563EB" }}
              >
                {field}
              </span>
              <button
                onClick={() => handleCopy(optimized, field)}
                className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              >
                {copied === field ? (
                  <><CheckCheck size={13} className="text-emerald-500" /><span className="text-emerald-600 font-medium">Copied!</span></>
                ) : (
                  <><Copy size={13} />Copy</>
                )}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                <p className="text-xs font-medium text-[#94A3B8] mb-1.5">Original</p>
                <p className="text-sm text-[#64748B]">{original}</p>
              </div>
              <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <RefreshCw size={11} style={{ color: "#2563EB" }} />
                  <p className="text-xs font-medium text-[#2563EB]">AI Optimized</p>
                </div>
                <p className="text-sm text-[#0F172A]">{optimized}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
