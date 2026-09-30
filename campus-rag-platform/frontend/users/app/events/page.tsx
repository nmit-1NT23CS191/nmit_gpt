"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Event = {
  id: number;
  title: string;
  description?: string;
  department?: string;
  category?: string;
  venue?: string;
  event_date: string;
  end_date?: string;
  capacity?: number;
  tags?: string;
  is_verified?: boolean;
};

const categories = ["All", "Technical", "Cultural", "Workshop", "Seminar", "Sports", "Social"];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, selectedCategory]);

  const loadEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      const eventList = Array.isArray(data) ? data : [];
      // Filter only verified and upcoming events
      const now = new Date();
      const upcomingEvents = eventList.filter(
        (event: Event) => event.is_verified !== false && new Date(event.event_date) >= now
      );
      setEvents(upcomingEvents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.venue?.toLowerCase().includes(query) ||
          event.department?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (event) =>
          event.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          event.department?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="text-lg text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          ⚠️
        </div>
        <h2 className="mb-2 text-xl font-bold text-red-900">Failed to Load Events</h2>
        <p className="mb-4 text-red-700">{error}</p>
        <button
          onClick={loadEvents}
          className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
        <h1 className="mb-2 text-4xl font-bold">Campus Events</h1>
        <p className="text-indigo-100">
          Discover {events.length} upcoming events across campus. No login required!
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search events by title, description, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === category
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
          <span>
            Showing <strong className="text-slate-900">{filteredEvents.length}</strong> of{" "}
            <strong className="text-slate-900">{events.length}</strong> events
          </span>
          <button
            onClick={loadEvents}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
            🔍
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Events Found</h3>
          <p className="text-slate-600">
            {searchQuery || selectedCategory !== "All"
              ? "Try adjusting your filters or search query"
              : "No upcoming events are currently scheduled"}
          </p>
          {(searchQuery || selectedCategory !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.event_date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isTomorrow =
    eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const getDateLabel = () => {
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return eventDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg">
      {/* Date Badge */}
      <div className="absolute right-4 top-4 z-10 flex flex-col items-center rounded-xl bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
        <div className="text-xs font-semibold uppercase text-slate-500">
          {eventDate.toLocaleDateString(undefined, { month: "short" })}
        </div>
        <div className="text-2xl font-bold text-slate-900">{eventDate.getDate()}</div>
      </div>

      {/* Placeholder Image */}
      <div className="h-48 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">
        <div className="flex h-full items-center justify-center text-6xl">
          {event.category === "Technical" ? "💻" : event.category === "Cultural" ? "🎭" : "🎓"}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category Badge */}
        {(event.category || event.department) && (
          <div className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            {event.category || event.department}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-xl font-bold text-slate-900 group-hover:text-indigo-600">
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="mb-4 line-clamp-2 text-sm text-slate-600">{event.description}</p>
        )}

        {/* Meta Info */}
        <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-slate-900">{getDateLabel()}</span>
            <span>·</span>
            <span>{eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1">{event.venue}</span>
            </div>
          )}
          {event.capacity && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Capacity: {event.capacity}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
