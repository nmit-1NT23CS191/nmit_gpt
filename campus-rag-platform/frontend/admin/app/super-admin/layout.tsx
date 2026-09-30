import Link from "next/link";

export default function SuperAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">NMIT Colloquium</div><h1 className="mt-1 text-2xl font-bold">Super Admin</h1></div>
          <nav className="flex gap-2 text-sm"><Link href="/super-admin/create-admin" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-white">Create Admin</Link><Link href="/super-admin/logs" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-white">Activity Logs</Link></nav>
        </header>
        {children}
      </div>
    </main>
  );
}