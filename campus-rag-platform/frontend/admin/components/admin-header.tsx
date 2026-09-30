"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [lightMode, setLightMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const savedMode = window.localStorage.getItem("admin-theme") === "light";
    setLightMode(savedMode);
    document.documentElement.classList.toggle("theme-light", savedMode);
  }, []);

  const toggleTheme = () => {
    const nextMode = !lightMode;
    setLightMode(nextMode);
    document.documentElement.classList.toggle("theme-light", nextMode);
    window.localStorage.setItem("admin-theme", nextMode ? "light" : "dark");
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchTerm.trim();
    router.push(term ? `/events?search=${encodeURIComponent(term)}` : "/events");
  };

  return (
    <header className="mb-7 flex min-h-14 items-center justify-between border-b border-slate-800 pb-4">
      <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
        <span>Admin</span><span>›</span><strong className="text-indigo-400">{pathname === "/events" ? "Events Management" : "Dashboard"}</strong>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <form onSubmit={handleSearch} className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 lg:flex">
          <span className="text-slate-500">⌕</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} aria-label="Search admin events" placeholder="Quick Search..." className="w-36 bg-transparent py-1 text-sm text-slate-200 outline-none placeholder:text-slate-500" />
          <button type="submit" className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500">Search</button>
        </form>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400 hover:text-white"
      >
        {lightMode ? "Dark" : "Light"}
      </button>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-right text-sm font-semibold text-white">Admin User</div>
          <div className="text-right text-xs text-slate-400">admin@nmit.edu.in</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">AD</div>
        <span className="text-slate-400">⌄</span>
      </div>
      </div>
    </header>
  );
}