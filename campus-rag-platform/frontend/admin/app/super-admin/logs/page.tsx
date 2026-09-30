"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type Log = { id: number; admin_email: string; action: string; target: string; details?: Record<string, unknown>; created_at: string };

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { const load = () => fetch(`${API_URL}/api/super-admin/logs`, { cache: "no-store" }).then((response) => response.json()).then((data) => { if (!Array.isArray(data)) throw new Error(data.detail || "Could not load logs."); setLogs(data); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load logs.")); void load(); const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, []);
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Super Admin Activity Logs</h2><p className="mt-1 text-sm text-slate-500">Live audit trail for system and administrator actions.</p><div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">{error ? <div className="p-8 text-center text-red-600">{error}</div> : <table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.length ? logs.map((log) => <tr key={log.id}><td className="px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td><td className="px-4 py-3">{log.admin_email}</td><td className="px-4 py-3 font-semibold text-indigo-600">{log.action}</td><td className="px-4 py-3">{log.target}</td><td className="px-4 py-3 text-xs text-slate-500">{log.details ? JSON.stringify(log.details) : "-"}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No activity recorded.</td></tr>}</tbody></table>}</div></section>;
}