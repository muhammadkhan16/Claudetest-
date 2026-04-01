"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/profit-center": "Profit Center",
  "/dashboard/ppc-optimizer": "PPC Optimizer",
  "/dashboard/listing-ai": "Listing AI",
  "/dashboard/client-audit": "Client Audit",
  "/dashboard/image-generator": "Image Generator",
  "/dashboard/amazon-connect": "Connect Amazon Account",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#E2E8F0] shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-[#0F172A]">{title}</h1>
            <p className="text-xs text-[#94A3B8]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 px-3 flex items-center rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <span className="text-xs font-medium text-emerald-700">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
