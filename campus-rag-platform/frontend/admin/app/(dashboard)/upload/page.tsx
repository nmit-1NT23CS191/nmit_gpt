"use client";

import { ChangeEvent, FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [fileUrl, setFileUrl] = useState("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setDraft({});
    setFileUrl("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Please choose a PDF, DOCX, or image file first.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const headers: Record<string, string> = {};
      const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/upload-poster`, {
        method: "POST",
        body: formData,
        headers,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || "OCR upload failed.");
      }

      const extracted = (payload.extracted ?? {}) as Record<string, unknown>;
      setDraft({
        title: String(extracted.title ?? ""),
        department: String(extracted.department ?? ""),
        venue: String(extracted.venue ?? ""),
        event_date: String(extracted.event_date ?? ""),
        end_date: String(extracted.end_date ?? ""),
        description: String(extracted.description ?? ""),
        capacity: String(extracted.capacity ?? ""),
        category: String(extracted.category ?? ""),
        tags: String(extracted.tags ?? ""),
      });
      setFileUrl(String(payload.file_url ?? ""));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "OCR upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (field: string, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handlePublish = async () => {
    if (!draft.title || !draft.venue || !draft.event_date) {
      setError("Title, venue, and event date are required before publishing.");
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/events/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          capacity: draft.capacity ? Number(draft.capacity) : null,
          file_url: fileUrl || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || "Event could not be published.");
      }
      window.location.href = "/events";
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Event could not be published.");
    } finally {
      setPublishing(false);
    }
  };

  const fields = [
    ["title", "Event title", "text"],
    ["department", "Department", "text"],
    ["venue", "Venue", "text"],
    ["event_date", "Start date and time", "datetime-local"],
    ["end_date", "End date and time", "datetime-local"],
    ["capacity", "Capacity", "number"],
    ["category", "Category", "text"],
    ["tags", "Tags", "text"],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-bold text-white">Two-step OCR pipeline</h2>
        <p className="mt-2 text-slate-300">
          Upload a PDF, DOCX, or image and run OCR extraction before publishing a campus event.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Select document</label>
            <input
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-full bg-sky-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {loading ? "Extracting OCR..." : "Run OCR extraction"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {Object.keys(draft).length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-white">Review extracted event</h3>
            <p className="mt-1 text-sm text-slate-300">Correct every field, then confirm to save this event permanently.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {fields.map(([field, label, type]) => (
              <label key={field} className="block text-sm text-slate-300">
                {label}
                <input
                  type={type}
                  value={draft[field] ?? ""}
                  onChange={(event) => updateDraft(field, event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-400"
                />
              </label>
            ))}
            <label className="block text-sm text-slate-300 md:col-span-2">
              Description
              <textarea
                value={draft.description ?? ""}
                onChange={(event) => updateDraft("description", event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing}
            className="mt-6 rounded-full bg-emerald-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {publishing ? "Publishing..." : "Confirm and publish event"}
          </button>
        </section>
      )}
    </div>
  );
}
