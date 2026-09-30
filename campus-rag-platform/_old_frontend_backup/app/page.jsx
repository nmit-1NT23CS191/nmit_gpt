"use client";

import Link from "next/link";
import { CalendarDays, MessageSquareText, Mic2, ArrowRight, Zap, Search, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="inline-flex items-center gap-2 bg-campus-accent/10 text-campus-accent text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-campus-accent/20">
          <Zap size={12} />
          Powered by Local AI · No Cloud APIs
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-campus-navy leading-tight max-w-2xl">
          Your Smart Campus,{" "}
          <span className="text-campus-accent">Always Informed</span>
        </h1>
        <p className="mt-4 text-slate-500 text-lg max-w-xl leading-relaxed">
          Discover events, ask the AI assistant about venues and schedules, and
          register for activities — all in one place. No sign-in required to
          browse or chat.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-campus-navy text-white font-medium rounded-xl px-6 py-3 hover:bg-campus-blue transition-colors shadow-md hover:shadow-lg"
          >
            <CalendarDays size={18} />
            Browse Events
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-campus-navy font-medium rounded-xl px-6 py-3 hover:border-campus-accent hover:text-campus-accent transition-colors shadow-sm"
          >
            <MessageSquareText size={18} />
            Talk to AI Assistant
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12 px-4 max-w-4xl mx-auto w-full">
        <FeatureCard
          icon={<Search size={22} className="text-campus-accent" />}
          title="Live Event Catalog"
          desc="Browse verified campus events filtered by department, date, and keyword. Updated the moment admins publish."
          href="/events"
          label="Browse Events"
        />
        <FeatureCard
          icon={<MessageSquareText size={22} className="text-campus-accent" />}
          title="AI Chat Assistant"
          desc="Ask questions in plain English — 'What CS events are next week?' or 'Is the auditorium free on Friday?'"
          href="/assistant"
          label="Open Chat"
        />
        <FeatureCard
          icon={<Mic2 size={22} className="text-campus-accent" />}
          title="Voice Conversation"
          desc="Use the Talk mode in the assistant for hands-free, full-duplex voice queries powered by on-device Whisper."
          href="/assistant"
          label="Try Voice"
        />
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href, label }) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-campus-accent hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 bg-campus-accent/10 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="font-semibold text-campus-navy text-base mb-2">{title}</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-4">{desc}</p>
      <span className="inline-flex items-center gap-1 text-campus-accent text-sm font-medium group-hover:gap-2 transition-all">
        {label} <ArrowRight size={14} />
      </span>
    </Link>
  );
}
