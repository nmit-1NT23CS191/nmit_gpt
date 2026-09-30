"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, MapPin, Building2, Search, ShieldAlert, Tag, Users, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export default function EventsFeedPage() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [registering, setRegistering] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch events from backend API (public, no auth needed)
  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/api/events`)
      .then((res) => setEvents(res.data || []))
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique categories from the loaded events
  const categories = useMemo(() => {
    const cats = new Set();
    events.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [events]);

  // Client-side filtering by search text and category
  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !search ||
        (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.tags || "").toLowerCase().includes(search.toLowerCase());
      const matchesCat = !category || e.category === category;
      return matchesSearch && matchesCat;
    });
  }, [events, search, category]);

  const handleRegister = async (event) => {
    setRegistering(event.id);
    setMessage(null);
    try {
      const { createClient } = await import("@/lib/supabase-client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `Register me for ${event.title}`,
          session_id: "catalog-quick-register",
        })
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const text = await res.text();
      const lines = text.split("\n").filter(Boolean);
      
      let replyText = "";
      let regStatus = null;
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === "text") {
            replyText += data.content;
          } else if (data.type === "metadata") {
            regStatus = data.registration_status;
          }
        } catch (e) {}
      }

      if (regStatus) {
        setMessage({ type: "success", text: `Registered for "${event.title}".` });
      } else {
        setMessage({
          type: "error",
          text: replyText || "Registration failed. Please log in first.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.message || "Registration failed. Please log in first.",
      });
    } finally {
      setRegistering(null);
    }
  };

  return (
    <div>
      {authError === "admin_required" && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            Admin access required. Your account does not have admin privileges.
            Contact IT to request an admin role upgrade.
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-campus-navy">Upcoming Campus Events</h1>
          <p className="text-slate-500 text-sm mt-1">Verified events, retrieved live from the RAG-backed catalog.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-campus-accent"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-campus-accent bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 text-sm rounded-lg p-3 border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-2" />
          <p className="text-slate-500 text-sm">Loading events…</p>
        </div>
      )}
      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <CalendarDays size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No events match your filters.</p>
          {(search || category) && (
            <button
              onClick={() => { setSearch(""); setCategory(""); }}
              className="mt-2 text-sm text-campus-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((event) => (
          <div key={event.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-campus-navy text-lg leading-tight">{event.title}</h2>
              {event.category && (
                <span className="bg-campus-accent/10 text-campus-accent text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border border-campus-accent/20">
                  {event.category}
                </span>
              )}
            </div>
            {event.department && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                <Building2 size={14} /> {event.department}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <MapPin size={14} /> {event.venue}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <CalendarDays size={14} /> {new Date(event.event_date).toLocaleString()}
            </div>
            {event.capacity && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <Users size={14} /> {event.capacity} seats
              </div>
            )}
            {event.description && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{event.description}</p>}
            {event.tags && (
              <div className="flex flex-wrap gap-1 mt-3">
                {event.tags.split(",").map((tag, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-0.5">
                    <Tag size={8} />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto pt-4">
              <button
                onClick={() => handleRegister(event)}
                disabled={registering === event.id}
                className="w-full bg-campus-navy text-white text-sm font-medium rounded-lg py-2 hover:bg-campus-blue transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {registering === event.id && <Loader2 size={14} className="animate-spin" />}
                {registering === event.id ? "Registering…" : "Register"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
