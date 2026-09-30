"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ActivityLog = {
  id: number;
  admin_email: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
  created_at: string;
};

const actionStyles: Record<string, string> = {
  UPLOAD: "bg-emerald-100 text-emerald-700",
  ADD: "bg-indigo-100 text-indigo-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/activity-logs`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || "Could not load activity logs.");
      setLogs(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    const refreshTimer = window.setInterval(() => void loadLogs(), 3000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-900">Activity Logs</h1><p className="mt-1 text-sm text-slate-500">Live audit trail of administrative actions.</p></div>
        <button onClick={() => void loadLogs()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Refresh</button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Timestamp</th><th className="px-5 py-4">Admin</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Target</th><th className="px-5 py-4">Details</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading activity...</td></tr> : error ? <tr><td colSpan={5} className="px-5 py-10 text-center text-red-500">{error}</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No activity recorded yet.</td></tr> : logs.map((log) => <tr key={log.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td><td className="px-5 py-4 font-medium text-slate-700">{log.admin_email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionStyles[log.action] || "bg-slate-100 text-slate-600"}`}>{log.action}</span></td><td className="max-w-[300px] px-5 py-4 text-slate-700">{log.target}</td><td className="max-w-[280px] break-words px-5 py-4 text-xs text-slate-500">{log.details ? JSON.stringify(log.details) : "-"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}