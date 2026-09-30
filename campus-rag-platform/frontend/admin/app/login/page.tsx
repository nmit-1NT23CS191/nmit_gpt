"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nmit.edu");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "super-admin">("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role: loginRole }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Unable to sign in.");
      const maxAge = rememberMe ? "; max-age=2592000" : "";
      document.cookie = `admin_authenticated=true; path=/${maxAge}`;
      document.cookie = `admin_role=${payload.user.role}; path=/${maxAge}`;
      document.cookie = `admin_access_token=${payload.access_token}; path=/${maxAge}`;
      router.push(loginRole === "super-admin" ? "/super-admin/logs" : "/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      <section className="hidden min-h-screen flex-1 flex-col justify-between overflow-hidden bg-[#30389b] p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Image src="/nitte-logo.jpeg" alt="NMIT logo" width={40} height={40} className="h-10 w-10 rounded-lg object-contain" />
          <div><div className="text-lg font-bold">NMIT Colloquium</div><div className="text-xs text-indigo-200">AI-Powered Management</div></div>
        </div>
        <div className="mx-auto max-w-xl text-center">
          <Image src="/nitte-logo.jpeg" alt="NMIT emblem" width={160} height={160} className="mx-auto h-40 w-40 rounded-2xl object-contain shadow-2xl" />
          <p className="mt-8 text-xl font-medium tracking-wide">NITTE MEENAKSHI INSTITUTE OF TECHNOLOGY</p>
          <h2 className="mt-2 text-5xl font-bold tracking-tight">COLLOQUIUM AI</h2>
          <p className="mx-auto mt-14 max-w-md text-sm leading-6 text-indigo-100">Manage colloquium events, extract insights from documents, and engage students with AI-powered search.</p>
        </div>
        <div />
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to your account to continue</p>
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Login type">
              {(["admin", "super-admin"] as const).map((role) => <button key={role} type="button" onClick={() => setLoginRole(role)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${loginRole === role ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{role === "admin" ? "Admin" : "Super Admin"}</button>)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-indigo-50 px-3 py-3 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label><button type="button" className="text-xs font-medium text-indigo-600">Forgot password?</button></div>
            <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-indigo-50 px-3 py-3 pr-12 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? "◉" : "⊙"}</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />Remember me</label>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}
