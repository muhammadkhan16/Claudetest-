"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { DEMO_BRANDS, type DemoBrand } from "@/lib/demo-data";
import { localStore } from "@/lib/local-store";
import { ChevronDown } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/profit-center": "Profit Center",
  "/dashboard/ppc-optimizer": "PPC Optimizer",
  "/dashboard/listing-ai": "Listing AI",
  "/dashboard/client-audit": "Client Audit",
  "/dashboard/image-generator": "Listing Images Analyzer",
  "/dashboard/amazon-connect": "Connect Amazon Account",
  "/dashboard/data-upload": "Upload Reports",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const title    = pageTitles[pathname] ?? "Dashboard";

  const [activeBrand, setActiveBrand]   = useState<DemoBrand>("bestlife4pets");
  const [isDemo, setIsDemo]             = useState(true);
  const [brandOpen, setBrandOpen]       = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("amzsuite_auth");
      if (!auth) { router.replace("/login"); return; }
    }
    setActiveBrand(localStore.getActiveBrand());
    setIsDemo(localStore.isUsingDemoData());

    const onBrandChange = (e: Event) => {
      const brand = (e as CustomEvent<DemoBrand>).detail;
      setActiveBrand(brand);
      setIsDemo(true);
    };
    window.addEventListener("amzsuite:brand-change", onBrandChange);
    return () => window.removeEventListener("amzsuite:brand-change", onBrandChange);
  }, [router]);

  function switchBrand(b: DemoBrand) {
    localStore.setActiveBrand(b);
    setActiveBrand(b);
    setBrandOpen(false);
    // Force pages to re-fetch by navigating to current path
    router.refresh();
  }

  const brand = DEMO_BRANDS[activeBrand];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-3.5 bg-white border-b border-[#E2E8F0] shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-[#0F172A]">{title}</h1>
            <p className="text-xs text-[#94A3B8]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">

            {/* Brand switcher */}
            <div className="relative">
              <button
                onClick={() => setBrandOpen((o) => !o)}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#374151]"
              >
                <span className="text-base leading-none">{brand.emoji}</span>
                <span className="max-w-[120px] truncate">{brand.name}</span>
                <ChevronDown size={12} className="text-[#94A3B8]" />
              </button>

              {brandOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#F1F5F9]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      {isDemo ? "Demo Accounts" : "Switch Brand"}
                    </p>
                  </div>
                  {(Object.entries(DEMO_BRANDS) as [DemoBrand, typeof brand][]).map(([key, b]) => (
                    <button
                      key={key}
                      onClick={() => switchBrand(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors ${
                        key === activeBrand ? "bg-[#EFF6FF]" : ""
                      }`}
                    >
                      <span className="text-xl leading-none">{b.emoji}</span>
                      <div>
                        <p className={`text-xs font-semibold ${key === activeBrand ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                          {b.name}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">Demo account</p>
                      </div>
                      {key === activeBrand && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                      )}
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-[#F1F5F9] bg-[#F8FAFC]">
                    <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                      Connect your Amazon account to see live data
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live / Demo status */}
            <div className={`h-7 px-3 flex items-center rounded-full border ${
              isDemo
                ? "bg-[#F8FAFC] border-[#E2E8F0]"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isDemo ? "bg-slate-400" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-xs font-medium ${isDemo ? "text-[#64748B]" : "text-emerald-700"}`}>
                {isDemo ? "Demo" : "Live"}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6" onClick={() => setBrandOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  );
}
