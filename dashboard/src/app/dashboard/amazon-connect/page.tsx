"use client";

import { useState } from "react";
import {
  Link2, CheckCircle2, AlertCircle, ChevronRight, ExternalLink,
  ShoppingBag, BarChart2, Package, Shield, Zap, Clock, Key,
  RefreshCw, Database, Globe, Lock, Info,
} from "lucide-react";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const SP_API_SCOPES = [
  { id: "sellingpartner:report", label: "Reports", icon: BarChart2, desc: "Access sales, advertising, and inventory reports" },
  { id: "sellingpartner:order", label: "Orders", icon: ShoppingBag, desc: "Read order data and fulfillment information" },
  { id: "sellingpartner:catalog", label: "Catalog", icon: Package, desc: "Access product listings and catalog data" },
  { id: "sellingpartner:finance", label: "Finance", icon: Database, desc: "Read financial transactions and settlements" },
];

const BENEFITS = [
  { icon: BarChart2, title: "Live Sales Data", desc: "Real-time revenue, orders, and conversion metrics automatically synced" },
  { icon: Package, title: "Inventory Sync", desc: "Track stock levels, FBA inventory, and reorder alerts automatically" },
  { icon: Zap, title: "Automated Reports", desc: "Business Reports, PPC data, and search terms — no manual downloads" },
  { icon: Shield, title: "Secure OAuth 2.0", desc: "Industry-standard authorization — we never store your seller credentials" },
];

export default function AmazonConnectPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [region, setRegion] = useState("NA");
  const [sellerId, setSellerId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const regions = [
    { code: "NA", label: "North America", markets: ["US", "CA", "MX", "BR"] },
    { code: "EU", label: "Europe", markets: ["UK", "DE", "FR", "IT", "ES", "NL", "SE", "PL", "TR", "AE", "IN"] },
    { code: "FE", label: "Far East", markets: ["JP", "AU", "SG"] },
  ];

  async function handleConnect() {
    if (!sellerId || !clientId || !clientSecret || !refreshToken) {
      alert("Please fill in all required fields before connecting.");
      return;
    }
    setStatus("connecting");
    setTestResult(null);

    // Simulate connection test
    await new Promise((r) => setTimeout(r, 2500));

    // In production this would POST to your backend which would test the SP-API credentials
    setStatus("connected");
    setTestResult("✓ Successfully connected to Amazon Seller Central\n✓ Seller ID verified: " + sellerId + "\n✓ Marketplace permissions granted\n✓ Initial data sync scheduled");
  }

  function handleDisconnect() {
    setStatus("disconnected");
    setSellerId("");
    setClientId("");
    setClientSecret("");
    setRefreshToken("");
    setTestResult(null);
    setActiveStep(1);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Connect Amazon Account</h2>
        <p className="text-sm text-[#94A3B8] mt-1">
          Link your Amazon Seller Central account via SP-API to enable live data sync
        </p>
      </div>

      {/* Status Banner */}
      {status === "connected" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Amazon account connected successfully</p>
            <p className="text-xs text-emerald-600 mt-0.5">Seller ID: {sellerId} · Region: {region} · Auto-sync every 6 hours</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs font-medium text-emerald-700 hover:text-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-red-200 bg-red-50">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Connection failed</p>
            <p className="text-xs text-red-600 mt-0.5">Please check your credentials and try again.</p>
          </div>
        </div>
      )}

      {/* Benefits */}
      {status === "disconnected" && (
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-[#2563EB]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Flow */}
      {status !== "connected" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              {[
                { n: 1, label: "Select Region" },
                { n: 2, label: "Enter Credentials" },
                { n: 3, label: "Verify & Connect" },
              ].map(({ n, label }, idx) => (
                <div key={n} className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStep(n)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeStep === n
                        ? "bg-[#2563EB] text-white"
                        : activeStep > n
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-[#F1F5F9] text-[#94A3B8]"
                    }`}
                  >
                    {activeStep > n ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">
                        {n}
                      </span>
                    )}
                    {label}
                  </button>
                  {idx < 2 && <ChevronRight size={14} className="text-[#CBD5E1]" />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: Region */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Select your marketplace region</h3>
                  <p className="text-xs text-[#94A3B8]">Choose the region where your Seller Central account is registered</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {regions.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => setRegion(r.code)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        region === r.code
                          ? "border-[#2563EB] bg-[#EFF6FF]"
                          : "border-[#E2E8F0] hover:border-[#BFDBFE]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Globe size={16} className={region === r.code ? "text-[#2563EB]" : "text-[#94A3B8]"} />
                        {region === r.code && <CheckCircle2 size={14} className="text-[#2563EB]" />}
                      </div>
                      <p className={`text-sm font-semibold ${region === r.code ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                        {r.label}
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-1">{r.markets.join(", ")}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                    Marketplace ID
                  </label>
                  <input
                    type="text"
                    value={marketplaceId}
                    onChange={(e) => setMarketplaceId(e.target.value)}
                    placeholder={region === "NA" ? "ATVPDKIKX0DER (US default)" : "Enter marketplace ID"}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                  <p className="text-xs text-[#94A3B8]">
                    Find this in Seller Central → Account Info → Marketplace Identifiers
                  </p>
                </div>

                <button
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#2563EB" }}
                >
                  Continue
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Step 2: Credentials */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Enter SP-API credentials</h3>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      You need to register an SP-API application in Seller Central first.{" "}
                      <a href="https://developer-docs.amazon.com/sp-api/docs/registering-your-application" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        View SP-API setup guide <ExternalLink size={10} className="inline" />
                      </a>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-1.5">
                      Seller ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="text"
                        value={sellerId}
                        onChange={(e) => setSellerId(e.target.value)}
                        placeholder="A1XXXXXXXXXXXXXX"
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-1.5">
                      LWA App Client ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="amzn1.application-oa2-client.xxxxxxxx"
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-1.5">
                      LWA Client Secret <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type={showSecret ? "text" : "password"}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                      >
                        <Shield size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-1.5">
                      Refresh Token <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <RefreshCw size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type={showToken ? "text" : "password"}
                        value={refreshToken}
                        onChange={(e) => setRefreshToken(e.target.value)}
                        placeholder="Atzr|xxxxxxxx..."
                        className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                      >
                        <Shield size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      Generated when you authorize the application in Seller Central
                    </p>
                  </div>
                </div>

                {/* API Permissions */}
                <div>
                  <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-2">
                    Required Permissions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SP_API_SCOPES.map(({ id, label, icon: Icon, desc }) => (
                      <div key={id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                          <Icon size={13} className="text-[#2563EB]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
                          <p className="text-[10px] text-[#94A3B8]">{desc}</p>
                        </div>
                        <CheckCircle2 size={12} className="text-emerald-500 ml-auto shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setActiveStep(3)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    Review & Connect
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verify & Connect */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Review and connect</h3>
                  <p className="text-xs text-[#94A3B8]">Verify your configuration before connecting</p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Connection Summary</p>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {[
                      { label: "Region", value: regions.find((r) => r.code === region)?.label ?? region, ok: true },
                      { label: "Marketplace ID", value: marketplaceId || "(using default)", ok: true },
                      { label: "Seller ID", value: sellerId || "Not entered", ok: !!sellerId },
                      { label: "Client ID", value: clientId ? clientId.slice(0, 20) + "..." : "Not entered", ok: !!clientId },
                      { label: "Client Secret", value: clientSecret ? "••••••••" : "Not entered", ok: !!clientSecret },
                      { label: "Refresh Token", value: refreshToken ? "Atzr|••••••••" : "Not entered", ok: !!refreshToken },
                    ].map(({ label, value, ok }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-[#64748B]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#0F172A]">{value}</span>
                          {ok ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={12} className="text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {testResult && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <pre className="text-xs text-emerald-700 whitespace-pre-wrap font-mono">{testResult}</pre>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <Shield size={13} className="text-[#2563EB] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#64748B]">
                    Your credentials are encrypted in transit and stored securely. We use OAuth 2.0 and never store your Seller Central password.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={status === "connecting"}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#10B981" }}
                  >
                    {status === "connecting" ? (
                      <>
                        <Clock size={14} className="animate-spin" />
                        Testing connection...
                      </>
                    ) : (
                      <>
                        <Link2 size={14} />
                        Connect Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected State — Data Sync Info */}
      {status === "connected" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Data Sync Status</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Sales Reports", status: "Synced", last: "2 min ago", color: "emerald" },
                { label: "PPC Data", status: "Synced", last: "2 min ago", color: "emerald" },
                { label: "Inventory", status: "Synced", last: "5 min ago", color: "emerald" },
                { label: "Search Terms", status: "Scheduled", last: "Next: 1h", color: "amber" },
                { label: "Financial Data", status: "Scheduled", last: "Next: 6h", color: "amber" },
              ].map(({ label, status: s, last, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color === "emerald" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className="text-xs text-[#374151]">{label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${color === "emerald" ? "text-emerald-600" : "text-amber-600"}`}>{s}</span>
                    <p className="text-[10px] text-[#94A3B8]">{last}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Connected Account</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Seller ID", value: sellerId },
                { label: "Region", value: regions.find((r) => r.code === region)?.label ?? region },
                { label: "Status", value: "Active" },
                { label: "Permissions", value: "4/4 granted" },
                { label: "Next sync", value: "In 6 hours" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">{label}</span>
                  <span className="text-xs font-medium text-[#0F172A]">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleDisconnect}
              className="mt-4 w-full px-4 py-2 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Disconnect Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
