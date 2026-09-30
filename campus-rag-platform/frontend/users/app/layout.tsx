import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NMIT Campus Connect - Discover Campus Events",
  description: "Explore campus events, connect with the AI assistant, and stay updated with everything happening at NITTE Meenakshi Institute of Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 antialiased">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 flex-shrink-0 border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-xl font-bold text-white shadow-lg">
                  N
                </div>
                <div className="hidden sm:block">
                  <div className="text-lg font-bold tracking-tight text-slate-900">
                    NMIT Campus Connect
                  </div>
                  <div className="text-xs text-slate-500">Discover What's Happening</div>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="flex items-center gap-1 sm:gap-2">
                <NavLink href="/">Home</NavLink>
                <NavLink href="/events">Events</NavLink>
                <NavLink href="/assistant">AI Assistant</NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-auto flex-shrink-0 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="mb-3 font-bold text-slate-900">NMIT Campus Connect</h3>
                <p className="text-sm text-slate-600">
                  Your gateway to campus events, powered by AI. Stay connected with everything happening at NITTE Meenakshi Institute of Technology.
                </p>
              </div>
              <div>
                <h3 className="mb-3 font-bold text-slate-900">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/events" className="text-slate-600 hover:text-indigo-600">Browse Events</Link></li>
                  <li><Link href="/assistant" className="text-slate-600 hover:text-indigo-600">Ask AI Assistant</Link></li>
                  <li><a href="https://nmit.ac.in" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-indigo-600">NMIT Website</a></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 font-bold text-slate-900">About</h3>
                <p className="text-sm text-slate-600">
                  Powered by local AI (Ollama + RAG). No external APIs. Built with Next.js, FastAPI, and Supabase.
                </p>
              </div>
            </div>
            <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
              © {new Date().getFullYear()} NITTE Meenakshi Institute of Technology. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600 sm:px-4"
    >
      {children}
    </Link>
  );
}
