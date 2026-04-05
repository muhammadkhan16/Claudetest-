"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Bot,
  ClipboardList,
  Image as ImageIcon,
  Link2,
  LogOut,
  Upload,
} from "lucide-react";

const mainNav = [
  { label: "Overview",      href: "/dashboard",                  icon: LayoutDashboard },
  { label: "Profit Center", href: "/dashboard/profit-center",    icon: TrendingUp      },
  { label: "PPC Optimizer", href: "/dashboard/ppc-optimizer",    icon: Target          },
  { label: "Listing AI",    href: "/dashboard/listing-ai",       icon: Bot             },
  { label: "Client Audit",  href: "/dashboard/client-audit",     icon: ClipboardList   },
  { label: "Listing Images Analyzer", href: "/dashboard/image-generator", icon: ImageIcon },
  { label: "Upload Reports", href: "/dashboard/data-upload",     icon: Upload          },
];

const connectNav = [
  { label: "Connect Amazon Account", href: "/dashboard/amazon-connect", icon: Link2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("amzsuite_auth");
    router.push("/login");
  }

  function NavItem({
    label,
    href,
    icon: Icon,
    sub = false,
    special = false,
  }: {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    sub?: boolean;
    special?: boolean;
  }) {
    const isActive =
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(href);

    if (special) {
      return (
        <Link
          href={href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
            isActive
              ? "text-white shadow-sm"
              : "text-[#2563EB] hover:bg-[#EFF6FF]"
          }`}
          style={isActive ? { backgroundColor: "#2563EB" } : { backgroundColor: isActive ? "" : "transparent" }}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-white/20" : "bg-blue-100"}`}>
            <Icon size={13} className={isActive ? "text-white" : "text-[#2563EB]"} />
          </div>
          <span className="font-semibold text-xs">{label}</span>
          {!isActive && <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">New</span>}
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          sub ? "px-4 pl-9" : "px-3"
        } ${
          isActive
            ? "text-white shadow-sm"
            : "text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        }`}
        style={isActive ? { backgroundColor: "#2563EB" } : {}}
      >
        <Icon
          size={sub ? 15 : 18}
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
  }

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

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {mainNav.map(({ label, href, icon }) => (
          <NavItem key={href} label={label} href={href} icon={icon} />
        ))}

        {/* Divider */}
        <div className="my-3 mx-2 border-t border-[#F1F5F9]" />
        <p className="px-3 py-1 text-[10px] font-semibold text-[#CBD5E1] uppercase tracking-wider">
          Integrations
        </p>
        {connectNav.map(({ label, href, icon }) => (
          <NavItem key={href} label={label} href={href} icon={icon} special />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#E2E8F0] space-y-1">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#2563EB]">SA</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0F172A] truncate">Supreme Admin</p>
            <p className="text-xs text-[#94A3B8] truncate">AmzSuite Pro</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
