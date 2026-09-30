"use client";

import { useRouter } from "next/navigation";
import { LogOut, LogIn, UserCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

/**
 * Client component for the nav user section.
 * Receives the pre-fetched `user` object from the server layout
 * (avoids an extra client-side fetch on mount).
 */
export default function NavUserWidget({ user, role }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh(); // force server components to re-render with no session
  };

  if (!user) {
    return (
      <a
        href="/login"
        className="flex items-center gap-1.5 hover:text-campus-light transition-colors"
      >
        <LogIn size={15} />
        Login
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-campus-light text-xs">
        <UserCircle2 size={15} />
        {user.email}
        {role === "admin" && (
          <span className="bg-campus-accent/20 text-campus-accent px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
            Admin
          </span>
        )}
      </span>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1 text-xs text-white/70 hover:text-campus-light transition-colors"
        title="Sign out"
      >
        <LogOut size={13} />
        Sign out
      </button>
    </div>
  );
}
