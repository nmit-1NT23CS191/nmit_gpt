"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Array<{ id: number; title: string; category?: string; department?: string }>>([]);
  useEffect(() => {
    const loadEvents = () => fetch(`${API_URL}/api/events`, { cache: "no-store" }).then((response) => response.json()).then((data) => setEvents(Array.isArray(data) ? data : [])).catch(() => setEvents([]));
    void loadEvents();
    const refreshTimer = window.setInterval(() => void loadEvents(), 15000);
    return () => window.clearInterval(refreshTimer);
  }, []);
  const groups = events.reduce<Record<string, number>>((result, event) => {
    const rawName = (event.department || event.category || "Department not specified").trim();
    const existingName = Object.keys(result).find((name) => name.toLowerCase() === rawName.toLowerCase());
    const key = existingName || rawName;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold text-slate-900">Analytics</h1><p className="mt-1 text-sm text-slate-500">Live event telemetry and department distribution.</p></div><div className="grid gap-4 sm:grid-cols-3">{[["Total Events", events.length], ["Departments", Object.keys(groups).length], ["Most Active", Object.entries(groups).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-slate-900">{value}</div></div>)}</div><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Department Split</h2><div className="mt-5 space-y-4">{Object.entries(groups).map(([name, count]) => <div key={name}><div className="flex justify-between text-sm text-slate-600"><span>{name}</span><span>{count}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(8, (count / Math.max(events.length, 1)) * 100)}%` }} /></div></div>)}</div></section></div>;
}