/** @format */

"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Store,
  Package,
  History,
  Settings,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { href: "/dashboard/shops", label: "Cửa hàng", icon: Store },
  { href: "/dashboard/products", label: "Sản phẩm", icon: Package },
  { href: "/dashboard/crawl-history", label: "Lịch sử quét", icon: History },
  { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={cn(
        "bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col h-screen",
        expanded ? "w-56" : "w-14"
      )}>
      {/* Logo / Toggle */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-slate-800 p-2 rounded transition-colors"
          title={expanded ? "Thu gọn" : "Mở rộng"}>
          {expanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 mx-1 rounded transition-colors text-sm",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  )}>
                  <Icon size={20} className="flex-shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom tools */}
      <div className="border-t border-slate-800 py-2 px-1 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Cài đặt">
          <Settings size={20} className="flex-shrink-0" />
          {expanded && <span className="text-sm">Cài đặt</span>}
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Trợ giúp">
          <HelpCircle size={20} className="flex-shrink-0" />
          {expanded && <span className="text-sm">Trợ giúp</span>}
        </button>
      </div>
    </aside>
  );
}
