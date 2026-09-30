"use client";

import { useState, useCallback, useEffect } from "react";
import {
  UploadCloud, CheckCircle2, AlertTriangle, X, Shield, FileText,
  Globe, Send, Edit3, Trash2, RefreshCw, Loader2, Calendar, MapPin
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // OCR draft response states
  const [draftUrl, setDraftUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);

  // Conflict and response states
  const [conflict, setConflict] = useState(null);
  const [publishedEventId, setPublishedEventId] = useState(null);
  const [error, setError] = useState(null);

  // Events management table state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // --------------- Fetch published events ---------------
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/events`);
      setEvents(res.data || []);
    } catch {
      // Silently fail — table will just show empty
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // --------------- Upload & OCR ---------------
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const reset = () => {
    setExtracted(null);
    setDraftUrl(null);
    setConflict(null);
    setPublishedEventId(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    reset();
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest("post", "/api/upload-poster", formData);
      setExtracted(res.data.extracted || {});
      setDraftUrl(res.data.file_url || null);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Document intake and OCR extraction failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setExtracted((prev) => ({ ...prev, [key]: value }));
  };

  // --------------- Publish ---------------
  const handlePublish = async () => {
    if (!extracted) return;
    setPublishing(true);
    setConflict(null);
    setError(null);

    const payload = {
      title: extracted.title || "Untitled Event",
      department: extracted.department || null,
      venue: extracted.venue || "TBD",
      event_date: extracted.event_date || new Date().toISOString(),
      end_date: extracted.end_date || null,
      description: extracted.description || null,
      capacity: extracted.capacity ? parseInt(extracted.capacity, 10) : 100,
      file_url: draftUrl,
      category: extracted.category || null,
      tags: extracted.tags || null,
    };

    try {
      const res = await apiRequest("post", "/api/events/publish", payload);
      setPublishedEventId(res.data.event_id);
      // Auto-refresh the events table
      fetchEvents();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && data) {
        setConflict(data);
      } else {
        setError(data?.detail || "Failed to publish event. Please verify all fields are valid.");
      }
    } finally {
      setPublishing(false);
    }
  };

  // --------------- Delete ---------------
  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Delete "${eventTitle}"? This cannot be undone.`)) return;
    setDeletingId(eventId);
    try {
      await apiRequest("delete", `/api/events/${eventId}`);
      fetchEvents();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-campus-navy flex items-center justify-center text-white">
            <Shield size={18} />
          </div>
          <h1 className="text-2xl font-bold text-campus-navy">Admin — Event Ingestion Panel</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Intake campus notices, schedules, or event posters (PDF, DOCX, or Image).
          Our local pipeline will run OCR and structure the fields for your manual review and approval before publishing.
        </p>
      </div>

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragging ? "border-campus-accent bg-campus-light/10 shadow-inner" : "border-slate-300 bg-white"
        }`}
      >
        <UploadCloud className="mx-auto text-slate-400 mb-3" size={42} />
        <div className="flex flex-col items-center justify-center gap-1.5 mb-4">
          <span className="text-sm font-semibold text-slate-700">Choose a poster or document file</span>
          <span className="text-xs text-slate-400">PDF, DOCX, PNG, JPG up to 10MB</span>
        </div>
        <input
          type="file"
          accept=".pdf,.docx,image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mx-auto text-sm block cursor-pointer border border-slate-200 rounded-lg p-1 bg-slate-50"
        />
        {file && (
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-700">
            <FileText size={14} className="text-slate-500" />
            <span>Selected: {file.name}</span>
          </div>
        )}
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-campus-navy text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-campus-blue transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
          >
            {uploading && <Loader2 size={15} className="animate-spin" />}
            {uploading ? "Extracting Draft via OCR..." : "Upload & Run OCR"}
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm shadow-sm animate-fade-in">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Conflict detection notice */}
      {conflict && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 relative shadow-sm animate-fade-in">
          <button onClick={() => setConflict(null)} className="absolute top-3 right-3 text-amber-500 hover:text-amber-700">
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
            <AlertTriangle size={18} />
            Venue Schedule Conflict
          </div>
          <p className="text-sm text-amber-700 mb-3">{conflict.message}</p>
          <div className="space-y-2">
            {conflict.conflicting_events?.map((ev) => (
              <div key={ev.id} className="bg-white border border-amber-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-slate-800">{ev.title}</p>
                <p className="text-slate-500 text-xs mt-1">
                  📅 {new Date(ev.event_date).toLocaleString()}
                  {ev.end_date ? ` – ${new Date(ev.end_date).toLocaleString()}` : ""}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">📍 Venue: {ev.venue}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-4">
            Suggestion: Edit the event venue or event date below to resolve this conflict, then press &quot;Confirm &amp; Publish&quot; again.
          </p>
        </div>
      )}

      {/* Editable OCR Review and Publish Section */}
      {extracted && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Edit3 size={18} className="text-campus-accent" />
              Human-in-the-Loop Verification
            </h2>
            {draftUrl && (
              <a
                href={draftUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-campus-accent hover:underline inline-flex items-center gap-1"
              >
                <Globe size={13} /> View Uploaded Attachment
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Review and adjust any fields extracted by the OCR engine. Click &quot;Confirm &amp; Publish Event&quot; to insert into Supabase and vector store.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Event Title *</span>
              <input
                value={extracted.title ?? ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. Hackathon 2025"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Department</span>
              <input
                value={extracted.department ?? ""}
                onChange={(e) => handleFieldChange("department", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. CSE, ISE"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Venue *</span>
              <input
                value={extracted.venue ?? ""}
                onChange={(e) => handleFieldChange("venue", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. Seminar Hall 3"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Max Seat Capacity</span>
              <input
                type="number"
                value={extracted.capacity ?? ""}
                onChange={(e) => handleFieldChange("capacity", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Start Date & Time (ISO 8601) *</span>
              <input
                value={extracted.event_date ?? ""}
                onChange={(e) => handleFieldChange("event_date", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="YYYY-MM-DDTHH:MM:SS"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">End Date & Time (ISO 8601)</span>
              <input
                value={extracted.end_date ?? ""}
                onChange={(e) => handleFieldChange("end_date", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="YYYY-MM-DDTHH:MM:SS"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Category</span>
              <input
                value={extracted.category ?? ""}
                onChange={(e) => handleFieldChange("category", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. Hackathon, Seminar, Workshop"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block">
              <span className="block mb-1.5">Tags</span>
              <input
                value={extracted.tags ?? ""}
                onChange={(e) => handleFieldChange("tags", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. coding, AI, tech (comma separated)"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 block md:col-span-2">
              <span className="block mb-1.5">Description Summary</span>
              <textarea
                rows={3}
                value={extracted.description ?? ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                disabled={!!publishedEventId || publishing}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-campus-accent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Summarize event activities..."
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={reset}
              disabled={publishing || !!publishedEventId}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Reset Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !!publishedEventId}
              className="bg-campus-navy text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-campus-blue transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
            >
              {publishing && <Loader2 size={15} className="animate-spin" />}
              <Send size={15} />
              {publishing ? "Publishing..." : "Confirm & Publish Event"}
            </button>
          </div>

          {publishedEventId && (
            <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 text-sm font-medium animate-fade-in">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>
                Success! Event #{publishedEventId} has been successfully verified, published to catalog, and embedded into Vector Database.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================= Events Management Table ========================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Published Events</h2>
          <button
            onClick={fetchEvents}
            disabled={eventsLoading}
            className="text-sm text-slate-500 hover:text-campus-navy inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={eventsLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {eventsLoading ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            No published events yet. Upload a poster above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Venue</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Tags</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[220px]">{ev.title}</div>
                      {ev.department && <div className="text-xs text-slate-400 mt-0.5">{ev.department}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 text-slate-600">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="truncate max-w-[140px]">{ev.venue}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(ev.event_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ev.category ? (
                        <span className="bg-campus-accent/10 text-campus-accent text-[10px] font-semibold px-2 py-0.5 rounded-full border border-campus-accent/20">
                          {ev.category}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ev.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {ev.tags.split(",").slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(ev.id, ev.title)}
                        disabled={deletingId === ev.id}
                        className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 p-1 rounded hover:bg-red-50"
                        title="Delete event"
                      >
                        {deletingId === ev.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
          {events.length} event{events.length !== 1 ? "s" : ""} in catalog
        </div>
      </div>
    </div>
  );
}
