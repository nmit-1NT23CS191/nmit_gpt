import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            Live Event Updates
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Discover Campus Life at <span className="text-yellow-300">NMIT</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-indigo-100 sm:text-xl">
            Stay connected with campus events, explore opportunities, and get instant answers from our AI-powered assistant. Everything you need to thrive at NITTE Meenakshi Institute of Technology.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-indigo-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Browse Events
              <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/assistant"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 text-center md:grid-cols-3">
          <StatItem number="100+" label="Campus Events" />
          <StatItem number="24/7" label="AI Availability" />
          <StatItem number="0" label="Login Required" highlight />
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center text-white shadow-lg sm:p-12">
        <h2 className="mb-4 text-3xl font-bold">Ready to Explore?</h2>
        <p className="mx-auto mb-8 max-w-2xl text-slate-300">
          No sign-up required. Start browsing events or chat with our AI assistant right away.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white transition-all hover:bg-indigo-500"
          >
            View All Events
          </Link>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            Try AI Assistant
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatItem({ number, label, highlight = false }: { number: string; label: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-4xl font-bold ${highlight ? "text-emerald-600" : "text-indigo-600"}`}>{number}</div>
      <div className="mt-2 text-slate-600">{label}</div>
    </div>
  );
}
