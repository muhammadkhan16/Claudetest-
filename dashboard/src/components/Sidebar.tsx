"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Bot,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { label: "Overview",      href: "/dashboard",                 icon: LayoutDashboard },
  { label: "Profit Center", href: "/dashboard/profit-center",   icon: TrendingUp      },
  { label: "PPC Optimizer", href: "/dashboard/ppc-optimizer",   icon: Target          },
  { label: "Listing AI",    href: "/dashboard/listing-ai",      icon: Bot             },
  { label: "Client Audit",  href: "/dashboard/client-audit",    icon: ClipboardList   },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-[#E2E8F0] shrink-0 shadow-sm">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E2E8F0]">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ backgroundColor: "#2563EB" }}
        >
          <span className="text-white font-bold text-base leading-none">A</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A] leading-tight">AmzSuite</p>
          <p className="text-xs text-[#94A3B8] leading-tight">Pro Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "text-white shadow-sm"
                  : "text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              }`}
              style={isActive ? { backgroundColor: "#2563EB" } : {}}
            >
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-[#94A3B8] group-hover:text-[#2563EB]"
                }`}
              />
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#2563EB]">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0F172A] truncate">John Doe</p>
            <p className="text-xs text-[#94A3B8] truncate">john@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
