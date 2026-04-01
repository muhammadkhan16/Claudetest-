"use client";

import { useState, useRef } from "react";
import {
  Image as ImageIcon, Search, Sparkles, Download, ZoomIn,
  AlertCircle, Loader2, CheckCircle2, X, ChevronLeft, ChevronRight,
  Globe, Languages, Package, Tag,
} from "lucide-react";

const MARKETPLACES = [
  { code: "US", label: "United States", flag: "🇺🇸", domain: "amazon.com" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧", domain: "amazon.co.uk" },
  { code: "DE", label: "Germany", flag: "🇩🇪", domain: "amazon.de" },
  { code: "FR", label: "France", flag: "🇫🇷", domain: "amazon.fr" },
  { code: "IT", label: "Italy", flag: "🇮🇹", domain: "amazon.it" },
  { code: "ES", label: "Spain", flag: "🇪🇸", domain: "amazon.es" },
  { code: "NL", label: "Netherlands", flag: "🇳🇱", domain: "amazon.nl" },
  { code: "CA", label: "Canada", flag: "🇨🇦", domain: "amazon.ca" },
];

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "DE", label: "German" },
  { code: "FR", label: "French" },
  { code: "ES", label: "Spanish" },
  { code: "IT", label: "Italian" },
  { code: "NL", label: "Dutch" },
  { code: "PT", label: "Portuguese" },
];

interface ProductData {
  asin: string;
  title: string;
  brand: string;
  price: string;
  images: string[];
  warning?: string;
  marketplace?: string;
}

export default function ImageGeneratorPage() {
  const [asin, setAsin] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [reportLanguage, setReportLanguage] = useState("EN");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [enhancements, setEnhancements] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"images" | "enhancements">("images");
  const reportRef = useRef<HTMLDivElement>(null);

  async function fetchImages() {
    const cleaned = asin.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(cleaned)) {
      setError("Please enter a valid 10-character Amazon ASIN (e.g. B08N5KWB9H)");
      return;
    }
    setError("");
    setProduct(null);
    setEnhancements(null);
    setLoading(true);

    try {
      const res = await fetch(`https://amazon-dashboard-api.masud-ba7.workers.dev/api/amazon-images?asin=${cleaned}&marketplace=${marketplace}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch product");
      }
      setProduct({ ...data, marketplace });
      setSelectedImages(new Set(data.images.map((_: string, i: number) => i)));
      setActiveTab("images");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function generateEnhancements() {
    if (!product) return;
    setEnhancing(true);
    setActiveTab("enhancements");

    try {
      const res = await fetch("https://amazon-dashboard-api.masud-ba7.workers.dev/api/enhance-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: product.asin,
          title: product.title,
          brand: product.brand,
          marketplace: product.marketplace ?? marketplace,
          language: reportLanguage,
          imageUrls: product.images.filter((_, i) => selectedImages.has(i)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnhancements(data.enhancements);
    } catch (e: unknown) {
      setEnhancements(`Error generating enhancements: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setEnhancing(false);
    }
  }

  async function downloadReport() {
    if (!reportRef.current || !product) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`image-enhancement-${product.asin}.pdf`);
    } catch (e) {
      alert("PDF generation failed: " + e);
    }
  }

  function toggleImageSelection(i: number) {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Image Generator</h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Fetch Amazon product images by ASIN and generate AI-powered enhancement recommendations
          </p>
        </div>
        {product && enhancements && (
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#2563EB" }}
          >
            <Download size={14} />
            Download PDF Report
          </button>
        )}
      </div>

      {/* ASIN Input */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        {/* Row 1: ASIN + Search Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Package size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={asin}
              onChange={(e) => setAsin(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && fetchImages()}
              placeholder="Enter Amazon ASIN (e.g. B08N5KWB9H)"
              maxLength={10}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchImages}
            disabled={loading || !asin.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#2563EB" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? "Fetching..." : "Fetch Images"}
          </button>
        </div>

        {/* Row 2: Marketplace + Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Marketplace */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Globe size={11} />
              Amazon Marketplace
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {MARKETPLACES.map((m) => (
                <button
                  key={m.code}
                  onClick={() => setMarketplace(m.code)}
                  title={`${m.label} (${m.domain})`}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    marketplace === m.code
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E2E8F0] hover:border-[#BFDBFE] text-[#64748B]"
                  }`}
                >
                  <span className="text-base leading-none">{m.flag}</span>
                  <span className="text-[10px] font-semibold">{m.code}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[#94A3B8]">
              Searching: {MARKETPLACES.find((m) => m.code === marketplace)?.domain}
            </p>
          </div>

          {/* Report Language */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Languages size={11} />
              Report Language
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setReportLanguage(l.code)}
                  className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    reportLanguage === l.code
                      ? "border-[#7C3AED] bg-purple-50 text-purple-700"
                      : "border-[#E2E8F0] hover:border-[#DDD6FE] text-[#64748B]"
                  }`}
                >
                  {l.code}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[#94A3B8]">
              {LANGUAGES.find((l) => l.code === reportLanguage)?.label} enhancement report
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={14} className="text-red-600 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Demo ASINs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#94A3B8]">Try a US ASIN:</span>
          {["B08N5KWB9H", "B0BDHX9PBK", "B07FZ8S74R"].map((demo) => (
            <button
              key={demo}
              onClick={() => { setAsin(demo); setMarketplace("US"); setError(""); }}
              className="text-xs font-mono text-[#2563EB] hover:underline bg-[#EFF6FF] px-2 py-0.5 rounded"
            >
              {demo}
            </button>
          ))}
        </div>
      </div>

      {/* Product Info + Images */}
      {product && (
        <div ref={reportRef}>
          {/* Product Header */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded">
                    {product.asin}
                  </span>
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Product Found</span>
                </div>
                <h3 className="text-base font-semibold text-[#0F172A] leading-snug">
                  {product.title}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  {product.brand && (
                    <div className="flex items-center gap-1 text-xs text-[#64748B]">
                      <Tag size={11} />
                      <span>{product.brand}</span>
                    </div>
                  )}
                  {product.price && product.price !== "N/A" && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <span>{product.price}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    <ImageIcon size={11} />
                    <span>{product.images.length} images found</span>
                  </div>
                </div>
              </div>

              {product.images.length > 0 && (
                <button
                  onClick={generateEnhancements}
                  disabled={enhancing || selectedImages.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shrink-0"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {enhancing ? "Analyzing..." : "Generate Enhancements"}
                </button>
              )}
            </div>

            {product.warning && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{product.warning}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          {product.images.length > 0 && (
            <div className="flex gap-1 mb-4 bg-[#F1F5F9] p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("images")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "images"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  Product Images
                </div>
              </button>
              <button
                onClick={() => setActiveTab("enhancements")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "enhancements"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  AI Enhancements
                  {enhancements && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Images Grid */}
          {activeTab === "images" && product.images.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Listing Images ({product.images.length})
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Click images to select for enhancement. Click zoom icon to view full size.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B]">
                    {selectedImages.size} selected
                  </span>
                  <button
                    onClick={() =>
                      setSelectedImages(
                        selectedImages.size === product.images.length
                          ? new Set()
                          : new Set(product.images.map((_, i) => i))
                      )
                    }
                    className="text-xs text-[#2563EB] hover:underline font-medium"
                  >
                    {selectedImages.size === product.images.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {product.images.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => toggleImageSelection(i)}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImages.has(i)
                        ? "border-[#2563EB] shadow-md"
                        : "border-[#E2E8F0] hover:border-[#BFDBFE]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Product image ${i + 1}`}
                      className="w-full aspect-square object-contain bg-gray-50"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />

                    {/* Image label */}
                    <div className="absolute top-1.5 left-1.5">
                      <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {i === 0 ? "MAIN" : `IMG ${i + 1}`}
                      </span>
                    </div>

                    {/* Selected indicator */}
                    {selectedImages.has(i) && (
                      <div className="absolute top-1.5 right-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Zoom button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightbox({ open: true, index: i });
                      }}
                      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow"
                    >
                      <ZoomIn size={13} className="text-[#0F172A]" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Image count stats */}
              <div className="mt-4 pt-4 border-t border-[#F1F5F9] grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-[#0F172A]">{product.images.length}</div>
                  <div className="text-xs text-[#94A3B8]">Total Images</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">1</div>
                  <div className="text-xs text-[#94A3B8]">Main Image</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-[#2563EB]">
                    {Math.max(0, product.images.length - 1)}
                  </div>
                  <div className="text-xs text-[#94A3B8]">Secondary Images</div>
                </div>
              </div>
            </div>
          )}

          {/* No images found */}
          {product.images.length === 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                <ImageIcon size={20} className="text-[#CBD5E1]" />
              </div>
              <p className="text-sm font-medium text-[#64748B]">No images could be fetched</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Amazon&apos;s bot protection blocked the request. Connect your Amazon account to access images directly via the SP-API.
              </p>
              <button
                onClick={generateEnhancements}
                disabled={enhancing}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 mx-auto"
                style={{ backgroundColor: "#7C3AED" }}
              >
                {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate Enhancement Plan (AI)
              </button>
            </div>
          )}

          {/* AI Enhancements */}
          {activeTab === "enhancements" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center gap-2" style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)" }}>
                <Sparkles size={15} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-[#0F172A]">AI Image Enhancement Report</h3>
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Claude AI
                </span>
              </div>
              <div className="p-6">
                {enhancing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Sparkles size={20} className="text-purple-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-[#0F172A]">Analyzing your images...</p>
                    <p className="text-xs text-[#94A3B8]">Claude is reviewing each image for enhancement opportunities</p>
                  </div>
                ) : enhancements ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">
                      {enhancements.split("\n").map((line, i) => {
                        if (line.startsWith("## ")) {
                          return <h2 key={i} className="text-lg font-bold text-[#0F172A] mt-6 mb-2">{line.slice(3)}</h2>;
                        }
                        if (line.startsWith("### ")) {
                          return <h3 key={i} className="text-base font-semibold text-[#1E40AF] mt-4 mb-2">{line.slice(4)}</h3>;
                        }
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return <p key={i} className="font-semibold text-[#0F172A] mt-2">{line.slice(2, -2)}</p>;
                        }
                        if (line.startsWith("- ") || line.startsWith("* ")) {
                          return (
                            <div key={i} className="flex items-start gap-2 my-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                              <span>{line.slice(2)}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("| ")) {
                          return <div key={i} className="font-mono text-xs bg-[#F8FAFC] px-2 py-0.5">{line}</div>;
                        }
                        if (line.startsWith("---")) {
                          return <hr key={i} className="my-4 border-[#E2E8F0]" />;
                        }
                        if (line.trim() === "") {
                          return <div key={i} className="h-2" />;
                        }
                        return <p key={i} className="my-1">{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Sparkles size={20} className="text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-[#64748B]">No enhancements generated yet</p>
                    <p className="text-xs text-[#94A3B8]">Select images from the Images tab and click &quot;Generate Enhancements&quot;</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!product && !loading && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={28} className="text-[#2563EB]" />
          </div>
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Enter an Amazon ASIN to get started</h3>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
            We&apos;ll fetch all listing images and generate AI-powered enhancement recommendations to improve your conversion rate.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { icon: Search, label: "Fetch Images", desc: "Main + secondary" },
              { icon: Sparkles, label: "AI Analysis", desc: "Claude-powered" },
              { icon: Download, label: "PDF Report", desc: "Download plan" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center">
                <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] flex items-center justify-center mx-auto mb-2">
                  <Icon size={16} className="text-[#2563EB]" />
                </div>
                <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
                <p className="text-xs text-[#94A3B8]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox.open && product && product.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox({ open: false, index: 0 })}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightbox({ open: false, index: 0 })}
          >
            <X size={24} />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
            }}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((prev) => ({
                ...prev,
                index: Math.min(product.images.length - 1, prev.index + 1),
              }));
            }}
          >
            <ChevronRight size={32} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[lightbox.index]}
            alt="Product image"
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            crossOrigin="anonymous"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightbox.index + 1} / {product.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
