import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import NavUserWidget from "@/components/NavUserWidget";

export const metadata = {
  title: "NMIT Smart Campus | Agentic Event Assistant",
  description: "RAG-based conversational AI for smart campus event information management.",
};

export default async function RootLayout({ children }) {
  // Fetch the session server-side so the nav can show the correct auth state
  // without a client-side flash. Errors are silently ignored (anon view).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  let role = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("supabase_uid", user.id)
      .maybeSingle();
    role = data?.role || "student";
  }

  return (
    <html lang="en">
      <body>
        <header className="bg-campus-navy text-white sticky top-0 z-50 shadow-md">
          <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              NMIT Smart Campus
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/events" className="hover:text-campus-light transition-colors">
                Events
              </Link>
              <Link href="/assistant" className="hover:text-campus-light transition-colors">
                AI Assistant
              </Link>
              {role === "admin" && (
                <Link href="/admin" className="hover:text-campus-light transition-colors">
                  Admin
                </Link>
              )}
              {/* Client component handles sign-out without making the whole layout a client component */}
              <NavUserWidget user={user} role={role} />
            </div>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
