"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type EventRecord = {
  id: number;
  title: string;
  category?: string | null;
  department?: string | null;
  venue?: string | null;
  event_date: string;
  end_date?: string | null;
  capacity?: number | null;
  description?: string | null;
  tags?: string | null;
  is_verified?: boolean;
};

const toDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):?(\d{2})?)?/);
    if (!match) return "";
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T${(match[4] || "00").padStart(2, "0")}:${match[5] || "00"}`;
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoDate = (value: string) => value ? new Date(value).toISOString() : null;

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", department: "", venue: "", event_date: "", capacity: 100, description: "", category: "", tags: "" });

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/events`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load events from the backend.");
      const payload = await response.json();
      setEvents(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
    const refreshTimer = window.setInterval(() => void loadEvents(), 15000);
    const initialSearch = new URLSearchParams(window.location.search).get("search");
    if (initialSearch) setFilter(initialSearch);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const visibleEvents = events.filter((event) =>
    `${event.title} ${event.category ?? ""} ${event.department ?? ""} ${event.venue ?? ""}`.toLowerCase().includes(filter.toLowerCase()),
  );

  const deleteEvent = async (event: EventRecord) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API_URL}/api/events/${event.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Event could not be deleted.");
      setEvents((current) => current.filter((item) => item.id !== event.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Event could not be deleted.");
    }
  };

  const saveEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/events/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing, event_date: toIsoDate(editing.event_date), end_date: null }),
      });
      if (!response.ok) throw new Error("Event could not be updated.");
      const payload = await response.json();
      const updated = payload.event as EventRecord;
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Event could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const createEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEvent.title || !newEvent.venue || !newEvent.event_date) {
      setError("Title, venue, and event date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/events/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEvent) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || payload?.message || "Event could not be created.");
      setAdding(false);
      setNewEvent({ title: "", department: "", venue: "", event_date: "", capacity: 100, description: "", category: "", tags: "" });
      await loadEvents();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Event could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const formFields = ["title", "department", "venue", "event_date", "category", "tags", "capacity"] as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Events Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and monitor all campus events.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => void loadEvents()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ↻ Refresh
          </button>
          <button onClick={() => setAdding(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            + Add Event
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-500"><span className="text-lg">☷</span> All Events <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">{events.length}</span></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search events..." aria-label="Search events" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 sm:w-64" />
          <button type="button" onClick={() => setFilter(filter.trim())} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Search</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Title</th>
              <th className="px-5 py-4">Department</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Venue</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading events...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-red-500">{error}</td></tr>
            ) : visibleEvents.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No events found.</td></tr>
            ) : visibleEvents.map((event) => {
              const start = new Date(event.event_date);
              return (
                <tr key={event.id} className="bg-white transition hover:bg-slate-50">
                  <td className="max-w-[220px] px-5 py-4 font-semibold text-slate-800">{event.title}</td>
                  <td className="px-5 py-4"><span className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase text-indigo-600">{event.category || event.department || "Not specified"}</span></td>
                  <td className="px-5 py-4 text-slate-500">{start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-5 py-4 text-slate-500">{start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</td>
                  <td className="max-w-[170px] px-5 py-4 text-slate-500">{event.venue || "-"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${start >= new Date() ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{start >= new Date() ? "Upcoming" : "Completed"}</span></td>
                  <td className="px-5 py-4 text-right"><button onClick={() => setEditing({ ...event, event_date: toDateTimeInput(event.event_date), end_date: toDateTimeInput(event.end_date) })} aria-label={`Edit ${event.title}`} className="mr-3 text-indigo-500 hover:text-indigo-700">✎</button><button onClick={() => void deleteEvent(event)} aria-label={`Delete ${event.title}`} className="text-red-400 hover:text-red-600">⌫</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={saveEvent} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Edit event</h2><button type="button" onClick={() => setEditing(null)} className="text-2xl text-slate-400">×</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["title", "department", "venue", "event_date", "category", "tags", "capacity"] as const).map((field) => (
                <label key={field} className="text-sm font-medium capitalize text-slate-600">{field.replace("_", " ")}
                  <input type={field.includes("date") ? "datetime-local" : field === "capacity" ? "number" : "text"} value={editing[field] ?? ""} onChange={(event) => setEditing({ ...editing, [field]: field === "capacity" ? Number(event.target.value) : event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-indigo-400" />
                </label>
              ))}
              <label className="text-sm font-medium text-slate-600 sm:col-span-2">Description<textarea value={editing.description ?? ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-indigo-400" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button></div>
          </form>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={createEvent} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Add event manually</h2><button type="button" onClick={() => setAdding(false)} className="text-2xl text-slate-400">×</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {formFields.map((field) => (
                <label key={field} className="text-sm font-medium capitalize text-slate-600">{field.replace("_", " ")}
                  <input type={field.includes("date") ? "datetime-local" : field === "capacity" ? "number" : "text"} value={newEvent[field]} onChange={(event) => setNewEvent({ ...newEvent, [field]: field === "capacity" ? Number(event.target.value) : event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-indigo-400" />
                </label>
              ))}
              <label className="text-sm font-medium text-slate-600 sm:col-span-2">Description<textarea value={newEvent.description} onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-indigo-400" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving..." : "Create event"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
