import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/get-user-role";
import { ShieldAlert } from "lucide-react";

/**
 * Protected admin layout (Server Component).
 *
 * Runs on the server before any /admin page renders:
 * 1. If the user is not logged in  → middleware already redirected to /login,
 *    but this is a safety net in case the middleware cookie check is stale.
 * 2. If the user is logged in but NOT admin → redirect to / with a toast param.
 * 3. If the user is admin → render children normally.
 *
 * This layout does NOT add any extra visual chrome — /admin pages keep the
 * root layout nav and just get an invisible auth gate.
 */
export default async function AdminLayout({ children }) {
  const role = await getUserRole();

  // No session — send to login, preserving the intended destination
  if (role === null) {
    redirect("/login?next=/admin");
  }

  // Logged in but not admin
  if (role !== "admin") {
    redirect("/?authError=admin_required");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-xl tracking-tight text-white gap-2">
          <ShieldAlert size={20} className="text-campus-accent" />
          NMIT Admin
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/admin" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Dashboard
          </a>
          <a href="/admin/upload" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Upload & OCR
          </a>
          <a href="/admin/events" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Manage Events
          </a>
          <a href="/admin/analytics" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Analytics
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div className="font-semibold text-slate-800 md:hidden flex items-center gap-2">
            <ShieldAlert size={18} className="text-campus-accent" /> Admin
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Admin Mode</span>
            {/* Minimal sign out relying on backend/supabase or link to root */}
            <form action="/auth/signout" method="POST">
              <button className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors font-medium">
                Sign Out
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
