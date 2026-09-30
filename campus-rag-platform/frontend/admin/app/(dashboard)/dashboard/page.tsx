"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type EventRecord = {
  id: number;
  title: string;
  event_date: string;
  venue?: string | null;
  department?: string | null;
  category?: string | null;
  capacity?: number | null;
};

type ActivityLog = {
  id: number;
  admin_email: string;
  action: string;
  target: string;
  created_at: string;
};

export default function EnhancedDashboard() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/api/events`, { cache: "no-store" }),
          fetch(`${API_URL}/api/activity-logs`, { cache: "no-store" }).catch(() => null),
        ]);

        const eventsData = await eventsRes.json();
        setEvents(Array.isArray(eventsData) ? eventsData : []);

        if (logsRes?.ok) {
          const logsData = await logsRes.json();
          setLogs(Array.isArray(logsData) ? logsData.slice(0, 5) : []);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
    const refreshTimer = window.setInterval(() => void loadData(), 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const today = new Date();
  const upcomingEvents = events.filter((event) => new Date(event.event_date) >= today);
  const pastEvents = events.filter((event) => new Date(event.event_date) < today);
  const thisMonth = events.filter((event) => {
    const date = new Date(event.event_date);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  });
  const departments = new Set(events.map((event) => event.department || event.category).filter(Boolean));

  const stats = [
    {
      label: "Total Events",
      value: events.length.toString(),
      subtitle: `${upcomingEvents.length} upcoming`,
      icon: "📊",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      label: "This Month",
      value: thisMonth.length.toString(),
      subtitle: today.toLocaleDateString(undefined, { month: "long" }),
      icon: "📅",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600"
    },
    {
      label: "Departments",
      value: departments.size.toString(),
      subtitle: "Active departments",
      icon: "🏢",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    },
    {
      label: "Completed",
      value: pastEvents.length.toString(),
      subtitle: "Past events",
      icon: "✓",
      color: "from-slate-500 to-slate-600",
      bgColor: "bg-slate-50",
      textColor: "text-slate-600"
    },
  ];

  const quickActions = [
    { label: "Upload Document", href: "/upload", icon: "📤", color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700" },
    { label: "Manage Events", href: "/events", icon: "📋", color: "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700" },
    { label: "View Analytics", href: "/analytics", icon: "📈", color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" },
    { label: "Activity Logs", href: "/activity-logs", icon: "🔍", color: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700" },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome back, Admin! 👋</h1>
            <p className="mt-2 text-indigo-100">
              {today.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/10 p-4 backdrop-blur-sm lg:block">
            <div className="text-4xl">🎓</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-400">{stat.subtitle}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} text-2xl`}>
                {stat.icon}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${stat.color} transition-transform group-hover:scale-x-100 scale-x-0 origin-left`}></div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group flex items-center gap-3 rounded-xl ${action.color} p-4 text-white shadow-sm transition-all hover:shadow-md`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
            <Link href="/events" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).length > 0 ? (
              upcomingEvents.slice(0, 5).map((event) => {
                const eventDate = new Date(event.event_date);
                return (
                  <div key={event.id} className="flex items-start gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50">
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                      <div className="text-xs font-medium">{eventDate.toLocaleDateString(undefined, { month: "short" })}</div>
                      <div className="text-lg font-bold">{eventDate.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{event.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {event.venue || "TBA"}
                      </p>
                      {event.department && (
                        <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                          {event.department}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">No upcoming events scheduled</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            <Link href="/activity-logs" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {logs.length > 0 ? (
              logs.map((log) => {
                const actionColors = {
                  UPLOAD: "bg-emerald-100 text-emerald-700",
                  ADD: "bg-blue-100 text-blue-700",
                  UPDATE: "bg-amber-100 text-amber-700",
                  DELETE: "bg-red-100 text-red-700",
                };
                return (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <span className={`mt-0.5 rounded-md px-2 py-1 text-xs font-semibold uppercase ${actionColors[log.action as keyof typeof actionColors] || "bg-slate-100 text-slate-600"}`}>
                      {log.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{log.target}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {log.admin_email} · {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">System Status</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">✓</div>
            <div>
              <p className="text-sm font-medium text-slate-700">API Status</p>
              <p className="text-xs text-emerald-600">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">🗄️</div>
            <div>
              <p className="text-sm font-medium text-slate-700">Database</p>
              <p className="text-xs text-blue-600">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white">🤖</div>
            <div>
              <p className="text-sm font-medium text-slate-700">AI Services</p>
              <p className="text-xs text-purple-600">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
