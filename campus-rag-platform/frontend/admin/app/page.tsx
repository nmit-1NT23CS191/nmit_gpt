import Link from "next/link";

const cards = [
  { label: "Active Events", value: "32", tone: "emerald" },
  { label: "Pending Uploads", value: "7", tone: "amber" },
  { label: "Registrations", value: "1,248", tone: "sky" },
];

export default function AdminHome() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Control center</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Campus operations overview</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Monitor campus activity, manage events, and coordinate uploads from a single secure workspace.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-sm text-slate-400">{card.label}</div>
            <div className="mt-3 text-3xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 text-xl font-semibold text-white">Quick actions</div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
            View dashboard
          </Link>
          <Link href="/events" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Manage events
          </Link>
          <Link href="/upload" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Run OCR pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
