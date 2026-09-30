"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?next= tells us where to redirect after successful login
  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("sign-in"); // "sign-in" | "sign-up"
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.user) {
          // Create the matching public.users profile row (role defaults to
          // 'student' per schema.sql — admin promotion happens out-of-band).
          const { error: profileError } = await supabase.from("users").insert({
            supabase_uid: data.user.id,
            name,
            email,
            department,
          });
          if (profileError) {
            // Non-fatal — backend will auto-create the row on first API call.
            console.warn("Profile insert warning:", profileError.message);
          }
        }
        // After sign-up go to / always (not admin — they need IT to promote role)
        router.push("/");
        router.refresh();
        return;
      }

      // sign-in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // Check the user's role so we can send admins directly to /admin
      const userId = data.user?.id;
      let destination = nextPath;

      if (userId) {
        // Unconditionally redirect admins to the admin dashboard upon login
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("supabase_uid", userId)
          .single();

        if (profile?.role === "admin") {
          destination = "/admin";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-xl font-bold text-campus-navy mb-1">
        {mode === "sign-in" ? "Sign in" : "Create your account"}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {mode === "sign-in"
          ? "Access your student or admin account."
          : "Register as a student to browse and join events."}
      </p>

      {/* Show a hint if redirected from /admin while not authorised */}
      {nextPath.startsWith("/admin") && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>Sign in with your admin account to access the dashboard.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "sign-up" && (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-accent"
            />
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Department"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-accent"
            />
          </>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-accent"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-campus-navy text-white text-sm font-medium rounded-lg py-2.5 hover:bg-campus-blue transition-colors disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="mt-4 text-sm text-campus-accent hover:underline"
      >
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>

      <p className="mt-6 text-xs text-slate-400">
        Admin accounts are provisioned by IT — sign in with the credentials your department gave
        you. Role is read from your profile, not chosen at signup.
      </p>
    </div>
  );
}
