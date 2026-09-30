"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CreateAdminPage() {
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/super-admin/admins`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Could not create admin account.");
      setMessage(`Admin account created for ${payload.email}.`);
      setForm({ email: "", name: "", password: "" });
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not create admin account."); } finally { setSaving(false); }
  };

  return <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Create Admin Account</h2><p className="mt-1 text-sm text-slate-500">Provision an existing-user login for the administrative portal.</p><form onSubmit={submit} className="mt-6 space-y-4">{([["email", "Email", "email"], ["name", "Name", "text"], ["password", "Temporary password", "password"]] as const).map(([field, label, type]) => <label key={field} className="block text-sm font-medium text-slate-600">{label}<input required minLength={field === "password" ? 8 : undefined} type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 outline-none focus:border-indigo-500" /></label>)}<button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? "Creating..." : "Create admin"}</button></form>{message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}</section>;
}