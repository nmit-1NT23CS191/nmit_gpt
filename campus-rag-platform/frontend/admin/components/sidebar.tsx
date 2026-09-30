"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/upload", label: "Upload Document" },
  { href: "/analytics", label: "Analytics" },
  { href: "/activity-logs", label: "Activity Logs" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isSuperAdmin = typeof document !== "undefined" && document.cookie.includes("admin_role=super_admin");

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950 px-3 py-6 md:block">
      <div className="mb-10 flex items-center gap-3 px-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">N</div>
        <div>
          <div className="text-sm font-bold text-white">NMIT Colloquium</div>
          <div className="text-[11px] text-indigo-300">Admin Portal</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${pathname === item.href ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <span className="w-5 text-center text-base">{item.href === "/dashboard" ? "▦" : item.href === "/events" ? "▣" : item.href === "/upload" ? "⇧" : item.href === "/analytics" ? "▥" : "♢"}</span>
              {item.label}
            </Link>
          </div>
        ))}
      </nav>

      {isSuperAdmin && <div className="mt-7 border-t border-slate-800 pt-5">
        <div className="px-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Super Admin</div>
        <div className="mt-2 px-4 text-sm text-slate-400">
          <Link href="/super-admin/create-admin" className="block py-1 hover:text-white">Create Admin</Link>
          <Link href="/super-admin/logs" className="block py-1 hover:text-white">System Logs</Link>
        </div>
      </div>}

      <button type="button" onClick={() => { document.cookie = "admin_authenticated=; Max-Age=0; path=/"; window.location.href = "/login"; }} className="absolute bottom-6 px-4 text-sm font-medium text-red-300 hover:text-red-200">
        <span className="mr-3">↪</span>Logout
      </button>
    </aside>
  );
}
