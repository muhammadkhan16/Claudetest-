"use client";

import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown,
  ChevronsUpDown, Sparkles, Copy, CheckCheck, Zap,
  AlertTriangle, Target, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetCloseButton, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────────────────────

interface SkuRow {
  sku: string; name: string; asin: string; category: string;
  revenue: number; cogs: number; ppcSpend: number; fbaFees: number;
  referralFee: number; refunds: number; netProfit: number;
  margin: number; tacos: number; refundRate: number; units: number;
}

const RAW_SKUS: SkuRow[] = [
  { sku: "AMZ-001", name: "Wireless Earbuds Pro",   asin: "B08N5LNQCX", category: "Electronics",
    revenue: 18420, cogs: 5526, ppcSpend: 1842, fbaFees: 2028, referralFee: 2763, refunds: 368,
    netProfit: 5893, margin: 32.0, tacos: 10.0, refundRate: 2.0, units: 461 },
  { sku: "AMZ-002", name: "Laptop Stand Aluminum",  asin: "B09K7XMRQZ", category: "Office",
    revenue: 11870, cogs: 3561, ppcSpend: 950,  fbaFees: 1305, referralFee: 1781, refunds: 237,
    netProfit: 4036, margin: 34.0, tacos: 8.0,  refundRate: 2.0, units: 339 },
  { sku: "AMZ-003", name: "USB-C Hub 7-Port",       asin: "B07WRQYZXP", category: "Electronics",
    revenue: 9300,  cogs: 3720, ppcSpend: 1395, fbaFees: 1023, referralFee: 1395, refunds: 930,
    netProfit: 837,  margin: 9.0,  tacos: 15.0, refundRate: 10.0, units: 332 },
  { sku: "AMZ-004", name: "Desk Cable Organizer",   asin: "B08LMKZPQR", category: "Office",
    revenue: 6540,  cogs: 1962, ppcSpend: 393,  fbaFees: 719,  referralFee: 981,  refunds: 131,
    netProfit: 2354, margin: 36.0, tacos: 6.0,  refundRate: 2.0, units: 327 },
  { sku: "AMZ-005", name: "Monitor Light Bar",      asin: "B09NXYZABC", category: "Electronics",
    revenue: 5990,  cogs: 2396, ppcSpend: 1198, fbaFees: 659,  referralFee: 899,  refunds: 599,
    netProfit: 239,  margin: 4.0,  tacos: 20.0, refundRate: 10.0, units: 200 },
  { sku: "AMZ-006", name: "Ergonomic Mouse Pad XL", asin: "B07TXY1234", category: "Office",
    revenue: 4200,  cogs: 1260, ppcSpend: 294,  fbaFees: 462,  referralFee: 630,  refunds: 84,
    netProfit: 1470, margin: 35.0, tacos: 7.0,  refundRate: 2.0, units: 168 },
  { sku: "AMZ-007", name: "Phone Stand 360°",       asin: "B08ABCDEF1", category: "Accessories",
    revenue: 2100,  cogs: 1050, ppcSpend: 630,  fbaFees: 231,  referralFee: 315,  refunds: 420,
    netProfit: -546, margin: -26.0, tacos: 30.0, refundRate: 20.0, units: 140 },
];

const TOTAL_REVENUE  = RAW_SKUS.reduce((s, r) => s + r.revenue, 0);
const TOTAL_PROFIT   = RAW_SKUS.reduce((s, r) => s + r.netProfit, 0);
const NET_PROFIT_PCT = (TOTAL_PROFIT / TOTAL_REVENUE) * 100;
const TOTAL_PPC      = RAW_SKUS.reduce((s, r) => s + r.ppcSpend, 0);
const TOTAL_TACOS    = (TOTAL_PPC / TOTAL_REVENUE) * 100;
const TOTAL_REFUNDS  = RAW_SKUS.reduce((s, r) => s + r.refunds, 0);
const REFUND_RATE    = (TOTAL_REFUNDS / TOTAL_REVENUE) * 100;

const KPI_CARDS = [
  { label: "Total Sales",   value: `$${(TOTAL_REVENUE/1000).toFixed(1)}k`,
    sub: `${RAW_SKUS.reduce((s,r)=>s+r.units,0).toLocaleString()} units sold`,
    change: "+12.5%", up: true,  icon: DollarSign,    iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { label: "Net Profit %",  value: `${NET_PROFIT_PCT.toFixed(1)}%`,
    sub: `$${(TOTAL_PROFIT/1000).toFixed(1)}k net`,
    change: "+2.1pp", up: true,  icon: TrendingUp,    iconBg: "#F0FDF4", iconColor: "#10B981" },
  { label: "TACoS",         value: `${TOTAL_TACOS.toFixed(1)}%`,
    sub: `$${(TOTAL_PPC/1000).toFixed(1)}k ad spend`,
    change: "-1.4pp", up: true,  icon: BarChart3,     iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { label: "Refund Rate",   value: `${REFUND_RATE.toFixed(1)}%`,
    sub: `$${(TOTAL_REFUNDS/1000).toFixed(1)}k returned`,
    change: "+0.3pp", up: false, icon: AlertTriangle, iconBg: "#FFF1F2", iconColor: "#EF4444" },
];

// ── AI Recs ────────────────────────────────────────────────────────────────

interface AiRec {
  listingScore: number; titleCurrent: string; titleOptimized: string;
  bulletsOptimized: string[]; keywordsToAdd: string[];
  nextSteps: Array<{
    action: string; category: "PPC"|"LISTING"|"PRICING"|"INVENTORY";
    urgency: "TODAY"|"THIS_WEEK"|"THIS_MONTH"; impact: string; difficulty: "Easy"|"Medium"|"Hard";
  }>;
}

const AI_RECS: Record<string, AiRec> = {
  "AMZ-001": {
    listingScore: 72,
    titleCurrent: "Wireless Earbuds with Charging Case",
    titleOptimized: "Wireless Earbuds Pro | Active Noise Cancelling, 32H Battery, IPX5 Waterproof | Bluetooth 5.3 Earphones with Charging Case",
    bulletsOptimized: [
      "ADVANCED ANC TECHNOLOGY — Dual-mic active noise cancellation blocks 30dB of ambient noise. Whether you're commuting, working, or at the gym, experience uninterrupted audio every time.",
      "32-HOUR TOTAL BATTERY LIFE — 8 hours per charge plus 24 additional hours from the compact LED case. Never miss a call or song with rapid 15-minute charging for 2 hours of playback.",
      "IPX5 WATERPROOF & SWEAT-PROOF — Engineered for active lifestyles. Sealed against rain, sweat, and splashes so your earbuds perform as hard as you do.",
    ],
    keywordsToAdd: ["active noise cancelling earbuds","bluetooth 5.3 earphones","wireless earbuds waterproof sport","earbuds with charging case"],
    nextSteps: [
      { action: "Add 'active noise cancelling earbuds' as exact-match keyword — currently getting impressions from a broad-match bleed with 340% ACoS", category: "PPC", urgency: "TODAY", impact: "Save ~$180/mo in wasted spend", difficulty: "Easy" },
      { action: "Update title to AI-optimized version — current title missing top 3 search terms by volume", category: "LISTING", urgency: "TODAY", impact: "Est. +18% organic impressions", difficulty: "Easy" },
      { action: "Add 5 negative exact-match terms from search term report — 'cheap earphones', 'wired earbuds', 'gaming headset' converting at 0%", category: "PPC", urgency: "THIS_WEEK", impact: "Recover $240 in wasted spend/month", difficulty: "Easy" },
      { action: "Test a 3% price increase from $39.99 → $41.99 — competitor average is $43.50 with lower reviews", category: "PRICING", urgency: "THIS_WEEK", impact: "+$736 net profit/month at same volume", difficulty: "Medium" },
    ],
  },
  "AMZ-002": {
    listingScore: 81,
    titleCurrent: "Laptop Stand Aluminum Adjustable",
    titleOptimized: "Laptop Stand Adjustable Aluminum | 6 Height Angles, Foldable Portable Riser | Compatible MacBook Pro Air, Dell, HP 10–17\" | Ergonomic Desk Stand",
    bulletsOptimized: [
      "6 ERGONOMIC HEIGHT ANGLES — Adjust from 15° to 75° to find your perfect viewing angle. Reduces neck and back strain by aligning your screen to eye level, recommended by ergonomists.",
      "ULTRA-PORTABLE DESIGN — Folds flat in seconds to fit in any laptop bag or backpack. Weighs just 340g yet supports laptops up to 20 lbs with aircraft-grade aluminum construction.",
      "UNIVERSAL COMPATIBILITY — Fits 10 to 17-inch laptops including MacBook Pro, MacBook Air, Dell XPS, HP Spectre, Lenovo ThinkPad, Surface and more.",
    ],
    keywordsToAdd: ["laptop riser ergonomic","adjustable laptop stand aluminum macbook","portable laptop stand foldable"],
    nextSteps: [
      { action: "Increase budget on 'laptop stand aluminum' exact-match campaign by 20% — ACoS is 6.2% against 28% break-even, strong scaling headroom", category: "PPC", urgency: "TODAY", impact: "+$420/mo revenue at current CVR", difficulty: "Easy" },
      { action: "Add 'MacBook' and 'Dell' compatibility to title — top 2 search modifiers not in current title", category: "LISTING", urgency: "THIS_WEEK", impact: "Est. +12% click-through rate", difficulty: "Easy" },
      { action: "Launch Sponsored Brand campaign with lifestyle image — strong candidate given high review count and BSR", category: "PPC", urgency: "THIS_WEEK", impact: "+15-25% branded impressions", difficulty: "Medium" },
    ],
  },
  "AMZ-003": {
    listingScore: 54,
    titleCurrent: "USB-C Hub 7 Port for Laptop",
    titleOptimized: "USB-C Hub 7-in-1 | 4K HDMI, 100W PD Charging, 3× USB-A 3.0, SD/TF Card Reader | Thunderbolt Compatible Docking Station for MacBook, iPad Pro, Windows",
    bulletsOptimized: [
      "4K HDMI & 100W POWER DELIVERY — Mirror or extend your display at full 4K@30Hz while simultaneously charging your laptop at up to 100W. One hub replaces your entire desktop cable setup.",
      "7 PORTS IN ONE COMPACT HUB — 4K HDMI output, 100W USB-C PD, 3× USB-A 3.0 (5Gbps), SD card reader, and MicroSD slot. Transfer files at up to 5Gbps — 10× faster than USB 2.0.",
      "UNIVERSAL THUNDERBOLT COMPATIBILITY — Works with MacBook Pro/Air M1 M2 M3, iPad Pro, Dell XPS, HP Spectre, and any USB-C device. Plug-and-play, no drivers required.",
    ],
    keywordsToAdd: ["usb c hub 7 in 1","usb c docking station 4k hdmi","thunderbolt hub macbook","usb c adapter multiport"],
    nextSteps: [
      { action: "CRITICAL: Pause 5 search terms with >$50 spend and 0 orders — 'usb hub desktop', 'usb splitter', 'usb 3.0 hub' are irrelevant product types", category: "PPC", urgency: "TODAY", impact: "Stop $312 in monthly wasted spend", difficulty: "Easy" },
      { action: "Reduce bids by 35% across all ad groups — ACoS is 15% vs 22% break-even. Current bids are overpaying for traffic", category: "PPC", urgency: "TODAY", impact: "Recover $180 contribution margin/mo", difficulty: "Easy" },
      { action: "Add 4K HDMI and 100W PD to title — the two highest-volume search modifiers absent from current copy", category: "LISTING", urgency: "THIS_WEEK", impact: "Est. +22% organic CTR", difficulty: "Easy" },
      { action: "Review refund reason reports — 10% refund rate is 5× category average. Likely a compatibility or packaging issue", category: "INVENTORY", urgency: "THIS_WEEK", impact: "Recovering 10% refund rate to 3% = +$650/mo", difficulty: "Hard" },
    ],
  },
  "AMZ-004": {
    listingScore: 78,
    titleCurrent: "Desk Cable Organizer Box",
    titleOptimized: "Cable Management Box | Hides Power Strips, Surge Protectors & Cords | Wood + ABS Desktop Organizer with 3 Cable Entry Slots | Home Office Cord Concealer",
    bulletsOptimized: [
      "HIDE THE CLUTTER INSTANTLY — Fits power strips up to 12 inches long and accommodates up to 6 power bricks. Transform a mess of cables into a clean, minimal desk setup in minutes.",
      "PREMIUM WOOD + ABS CONSTRUCTION — Natural bamboo lid with durable ABS base. Unlike flimsy all-plastic competitors, this organizer is built to last and matches any home office aesthetic.",
      "3 SIDE ENTRY SLOTS — Route cables in and out from front, back, or side without bending or stressing connections. Compatible with thick surge protector cables and slim USB cords alike.",
    ],
    keywordsToAdd: ["cable management box power strip","cord concealer desk organizer","cable organizer box wood"],
    nextSteps: [
      { action: "Increase daily budget from $13 → $18 on 'cable management box' campaign — consistently hitting budget cap before 3pm", category: "PPC", urgency: "TODAY", impact: "+$180/mo revenue, ACoS stays ~6%", difficulty: "Easy" },
      { action: "Add wood/bamboo material callout to title — 'wood' modifier has 2.8× higher conversion rate vs generic cable box searches", category: "LISTING", urgency: "THIS_WEEK", impact: "Est. +8% CVR", difficulty: "Easy" },
    ],
  },
  "AMZ-005": {
    listingScore: 49,
    titleCurrent: "Monitor LED Light Bar",
    titleOptimized: "Monitor Light Bar LED | Auto-Dimming, USB-C Powered, No Glare Screen Illumination | 3 Color Temperatures, Touch Control | PC Gaming & Home Office Desk Lamp",
    bulletsOptimized: [
      "ZERO SCREEN GLARE DESIGN — Patented asymmetric optical design directs light downward onto your desk and keyboard without reflecting off your monitor. Designed specifically for flat and curved screens.",
      "AUTO-DIMMING & 3 COLOR MODES — Built-in ambient light sensor automatically adjusts brightness. Switch between warm (2700K), neutral (4000K), and cool (6500K) white with a single touch.",
      "USB-C POWERED — No external adapter needed. Draws power directly from your monitor's USB-C or USB-A port. Clean setup with a single cable hidden behind your display.",
    ],
    keywordsToAdd: ["monitor light bar no glare","led light bar for monitor usb c","gaming monitor light bar","screen light bar auto dimming"],
    nextSteps: [
      { action: "URGENT: Reduce TACoS from 20% to target 12%. Pause all auto-campaign keywords with >5 clicks and 0 conversions immediately", category: "PPC", urgency: "TODAY", impact: "Save $360/month, improve margin from 4% to 10%", difficulty: "Easy" },
      { action: "Add 'No Glare' and 'Auto-Dimming' to title — differentiation features that top 3 competitors all include", category: "LISTING", urgency: "TODAY", impact: "Est. +15% CTR from search", difficulty: "Easy" },
      { action: "Investigate 10% refund rate — pull Buyer-Seller messages for common complaints. Likely flicker issue or USB-C compatibility gap", category: "INVENTORY", urgency: "THIS_WEEK", impact: "Fixing to 3% = +$420/month margin recovery", difficulty: "Medium" },
      { action: "Consider a $2 price reduction from $29.99 → $27.99 — currently in the gap between two price bands with lower conversion", category: "PRICING", urgency: "THIS_MONTH", impact: "CVR may increase 12-18% at lower price point", difficulty: "Medium" },
    ],
  },
  "AMZ-006": {
    listingScore: 85,
    titleCurrent: "Extra Large Mouse Pad for Desk",
    titleOptimized: "Extended Mouse Pad XL | 36×18\" Desk Mat | Non-Slip Stitched Edge | Water-Resistant Surface | Gaming & Office Desk Pad for Keyboard and Mouse",
    bulletsOptimized: [
      "DESK-SIZED PROTECTION — Massive 36×18 inch surface covers your entire workspace. Protects your desk from scratches while providing a smooth, consistent glide surface for both mouse and keyboard.",
      "MILITARY-GRADE STITCHED EDGES — Precision-stitched borders resist fraying and peeling that cheap pads develop within weeks. Built to maintain a flat, clean edge through years of daily use.",
      "NON-SLIP RUBBER BASE — Micro-textured natural rubber backing grips any surface — wood, glass, or laminate — without shifting during intense gaming sessions or rapid typing.",
    ],
    keywordsToAdd: ["extended mouse pad xl desk mat","large gaming mouse pad non slip","desk mat keyboard mouse pad"],
    nextSteps: [
      { action: "Scale 'extended mouse pad xl' exact-match campaign by 25% — running at 5.2% ACoS against 30% break-even, massive headroom", category: "PPC", urgency: "TODAY", impact: "+$310/month revenue at current CVR", difficulty: "Easy" },
      { action: "Add dimensions (36×18\") to title — the top search refinement for desk mats is size-specific", category: "LISTING", urgency: "THIS_WEEK", impact: "Est. +10% CVR for size-intent searches", difficulty: "Easy" },
    ],
  },
  "AMZ-007": {
    listingScore: 31,
    titleCurrent: "360 Degree Phone Holder Stand",
    titleOptimized: "Phone Stand 360° Rotating | Adjustable Desk Holder for iPhone 15/14/13/12, Samsung Galaxy, iPad Mini | Foldable Portable Mount for Video Calls, Reading",
    bulletsOptimized: [
      "360° ROTATION + TILT ADJUSTMENT — Rotate to any angle for portrait or landscape viewing. Silicone-padded clamp holds phones and tablets from 4 to 10.5 inches without scratching.",
      "FOLDABLE IN SECONDS — Collapses to the size of a deck of cards for your pocket or bag. Opens to a stable, heavy base that doesn't wobble during video calls or recipe browsing.",
      "COMPATIBLE WITH ALL DEVICES — Works with iPhone 15/14/13/12/Pro/Max, Samsung Galaxy S24/S23, Google Pixel, iPad Mini, Kindle, and all smartphones and small tablets.",
    ],
    keywordsToAdd: ["phone stand for desk adjustable","cell phone holder stand 360","iphone stand for desk foldable"],
    nextSteps: [
      { action: "CRITICAL: Pause all PPC campaigns immediately — -26% margin means every ad-driven sale deepens the loss. Fix unit economics first", category: "PPC", urgency: "TODAY", impact: "Stop hemorrhaging $630/month in ad spend", difficulty: "Easy" },
      { action: "Audit COGS with supplier — at $7.50/unit COGS for a $15 item, there is almost no margin after FBA + referral fees", category: "PRICING", urgency: "TODAY", impact: "Renegotiating to $5/unit restores 15% margin", difficulty: "Hard" },
      { action: "Test price increase to $17.99 — break-even price with current COGS is ~$18.50 before ads", category: "PRICING", urgency: "THIS_WEEK", impact: "Path to profitability at higher price + lower COGS", difficulty: "Medium" },
      { action: "Update title with device compatibility list — current title has no model numbers, missing 60% of model-specific searches", category: "LISTING", urgency: "THIS_WEEK", impact: "Organic traffic needed while PPC is paused", difficulty: "Easy" },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt  = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);

function scoreBg(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

const URGENCY_MAP = {
  TODAY:      { label: "Today",      cls: "danger"  },
  THIS_WEEK:  { label: "This Week",  cls: "warning" },
  THIS_MONTH: { label: "This Month", cls: "info"    },
} as const;

const CAT_ICON = {
  PPC:       <Zap size={13} />,
  LISTING:   <Sparkles size={13} />,
  PRICING:   <DollarSign size={13} />,
  INVENTORY: <AlertTriangle size={13} />,
};

type SortKey = keyof Pick<SkuRow, "revenue"|"margin"|"tacos"|"refundRate"|"netProfit">;

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfitCenterPage() {
  const [sortKey, setSortKey]      = useState<SortKey>("margin");
  const [sortDir, setSortDir]      = useState<"asc"|"desc">("desc");
  const [selectedSku, setSelected] = useState<SkuRow | null>(null);
  const [copied, setCopied]        = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...RAW_SKUS].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const rec = selectedSku ? AI_RECS[selectedSku.sku] : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Profit Command Center</h2>
        <p className="text-sm text-[#94A3B8] mt-1">Margin analytics, cost breakdown, and AI optimization per SKU</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, value, sub, change, up, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
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
            <p className="text-xs text-[#CBD5E1] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Profit Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">SKU Profitability Breakdown</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">Click any row to open AI optimization panel</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &gt;20%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 0–20%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &lt;0%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Product</th>
                <SortTh label="Revenue"    col="revenue"    active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Net Profit" col="netProfit"  active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Margin"     col="margin"     active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="TACoS"      col="tacos"      active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Refund %"   col="refundRate" active={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {sorted.map((row) => (
                <tr
                  key={row.sku}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer transition-all duration-100 group
                             hover:bg-[#EFF6FF] hover:shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                      {row.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-[#0F172A] text-sm">{row.name}</div>
                    <div className="text-xs text-[#94A3B8] font-mono">{row.asin}</div>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[#334155] font-medium">{fmtK(row.revenue)}</td>
                  <td className="px-4 py-3.5 tabular-nums">
                    <span className={row.netProfit < 0 ? "text-red-500 font-semibold" : "text-[#334155] font-medium"}>
                      {row.netProfit < 0 ? `-$${Math.abs(row.netProfit).toLocaleString()}` : fmtK(row.netProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tabular-nums",
                      row.margin > 20  ? "bg-emerald-50 text-emerald-700"
                      : row.margin >= 0 ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-600"
                    )}>
                      {row.margin > 0 ? "+" : ""}{row.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      row.tacos > 20 ? "text-red-500" : row.tacos > 12 ? "text-amber-600" : "text-[#64748B]"
                    )}>
                      {row.tacos.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      row.refundRate > 8 ? "text-red-500" : row.refundRate > 4 ? "text-amber-600" : "text-[#64748B]"
                    )}>
                      {row.refundRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center
                                 gap-1 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      <Sparkles size={13} />Optimize
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <span className="text-xs text-[#94A3B8]">{RAW_SKUS.length} SKUs · Last 30 days</span>
          <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
            <span>Total Revenue: <strong className="text-[#0F172A]">{fmtK(TOTAL_REVENUE)}</strong></span>
            <span>Total Profit: <strong className={TOTAL_PROFIT >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtK(TOTAL_PROFIT)}</strong></span>
          </div>
        </div>
      </div>

      {/* Optimization Drawer */}
      <Sheet open={!!selectedSku} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent width={560}>
          {selectedSku && rec && (
            <>
              <SheetHeader>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "h-1 rounded-full mb-3 w-16",
                    selectedSku.margin > 20 ? "bg-emerald-500" : selectedSku.margin >= 0 ? "bg-amber-500" : "bg-red-500"
                  )} />
                  <SheetTitle>{selectedSku.name}</SheetTitle>
                  <SheetDescription>
                    <span className="font-mono">{selectedSku.sku}</span>
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    <span className="font-mono">{selectedSku.asin}</span>
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    {selectedSku.category}
                  </SheetDescription>
                </div>
                <SheetCloseButton />
              </SheetHeader>

              <SheetBody>

                {/* Listing Score */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Listing Health Score</h4>
                    <span className={cn("text-2xl font-bold tabular-nums", scoreBg(rec.listingScore))}>
                      {rec.listingScore}<span className="text-sm font-normal text-[#94A3B8]">/100</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700",
                        rec.listingScore >= 75 ? "bg-emerald-500" : rec.listingScore >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${rec.listingScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#64748B] mt-1.5">
                    {rec.listingScore >= 75 ? "Strong listing — focus on PPC scaling and pricing."
                    : rec.listingScore >= 50 ? "Moderate listing — keyword gaps limiting organic reach."
                    : "Critical listing issues — organic traffic significantly impacted."}
                  </p>
                </section>

                {/* Cost Breakdown */}
                <section>
                  <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Cost Breakdown</h4>
                  <div className={cn(
                    "rounded-xl p-4 space-y-2 text-sm border",
                    selectedSku.margin > 20 ? "bg-emerald-50 border-emerald-200"
                    : selectedSku.margin >= 0 ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                  )}>
                    {[
                      ["Revenue",    selectedSku.revenue,     false],
                      ["COGS",      -selectedSku.cogs,        true ],
                      ["FBA Fees",  -selectedSku.fbaFees,     true ],
                      ["Referral",  -selectedSku.referralFee, true ],
                      ["PPC Spend", -selectedSku.ppcSpend,    true ],
                      ["Refunds",   -selectedSku.refunds,     true ],
                    ].map(([label, val, isDeduct]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <span className="text-[#64748B] text-xs">{label as string}</span>
                        <span className={cn("tabular-nums text-xs font-medium",
                          isDeduct ? "text-red-500" : "text-[#0F172A]")}>
                          {(val as number) < 0 ? `-${fmt(Math.abs(val as number))}` : fmt(val as number)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-[#E2E8F0] pt-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#334155]">Net Profit</span>
                      <span className={cn("tabular-nums text-sm font-bold",
                        selectedSku.netProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {selectedSku.netProfit < 0 ? `-${fmt(Math.abs(selectedSku.netProfit))}` : fmt(selectedSku.netProfit)}
                        {" "}<span className="text-xs font-medium opacity-70">({selectedSku.margin.toFixed(1)}%)</span>
                      </span>
                    </div>
                  </div>
                </section>

                {/* AI Title */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={13} style={{ color: "#2563EB" }} />
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">AI Title Optimization</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                      <p className="text-[11px] font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">Current</p>
                      <p className="text-sm text-[#64748B] leading-snug">{rec.titleCurrent}</p>
                    </div>
                    <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <Sparkles size={11} style={{ color: "#2563EB" }} />
                          <p className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">AI Optimized</p>
                        </div>
                        <button
                          onClick={() => handleCopy(rec.titleOptimized, "title")}
                          className="flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                        >
                          {copied === "title"
                            ? <><CheckCheck size={11} className="text-emerald-500" /><span className="text-emerald-600">Copied</span></>
                            : <><Copy size={11} />Copy</>}
                        </button>
                      </div>
                      <p className="text-sm text-[#0F172A] leading-snug">{rec.titleOptimized}</p>
                    </div>
                  </div>
                </section>

                {/* AI Bullets */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={13} className="text-blue-500" />
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">AI Bullet Points</h4>
                  </div>
                  <div className="space-y-2">
                    {rec.bulletsOptimized.map((bullet, i) => (
                      <div key={i} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#334155] leading-snug">
                        <span className="font-bold text-[#0F172A]">{bullet.split("—")[0]}</span>
                        {bullet.includes("—") && <span className="text-[#64748B]">{"—" + bullet.split("—").slice(1).join("—")}</span>}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Keywords */}
                <section>
                  <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Keywords to Add</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.keywordsToAdd.map((kw) => (
                      <Badge key={kw} variant="info" className="text-xs cursor-default">{kw}</Badge>
                    ))}
                  </div>
                </section>

                {/* Next Steps */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={13} style={{ color: "#2563EB" }} />
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Next Steps</h4>
                  </div>
                  <div className="space-y-2.5">
                    {rec.nextSteps.map((step, i) => {
                      const urg = URGENCY_MAP[step.urgency];
                      return (
                        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2
                                                 hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-[#334155] leading-snug flex-1">{step.action}</p>
                            <Badge variant={urg.cls as "danger"|"warning"|"info"} className="shrink-0 flex items-center gap-1">
                              <Clock size={10} />{urg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="flex items-center gap-1">
                              {CAT_ICON[step.category]}{step.category}
                            </Badge>
                            <Badge variant={step.difficulty === "Easy" ? "success" : step.difficulty === "Medium" ? "warning" : "danger"}>
                              {step.difficulty}
                            </Badge>
                            <span className="text-xs text-emerald-600 font-semibold ml-auto">{step.impact}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

              </SheetBody>

              <SheetFooter>
                <Button variant="primary" size="md" className="flex-1"
                  onClick={() => handleCopy([rec.titleOptimized, ...rec.bulletsOptimized].join("\n\n"), "all")}>
                  {copied === "all" ? <><CheckCheck size={15} />Copied All</> : <><Copy size={15} />Copy Optimized Copy</>}
                </Button>
                <Button variant="outline" size="md" onClick={() => setSelected(null)}>Close</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

// ── SortTh ────────────────────────────────────────────────────────────────

function SortTh({ label, col, active, dir, onSort }: {
  label: string; col: SortKey; active: SortKey; dir: "asc"|"desc"; onSort: (k: SortKey) => void;
}) {
  const isActive = active === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors",
        "hover:text-[#0F172A]",
        isActive ? "text-[#2563EB]" : "text-[#94A3B8]"
      )}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive
          ? dir === "desc" ? <ChevronDown size={13} /> : <ChevronUp size={13} />
          : <ChevronsUpDown size={12} className="opacity-40" />}
      </span>
    </th>
  );
}
