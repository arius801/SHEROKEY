"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type TicketRow = {
  ticket: {
    id: number;
    email: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    unreadForAdmin: boolean;
    lastMessageAt: string;
  };
  assignedName: string | null;
};

export default function AdminSupportPage() {
  const [items, setItems] = useState<TicketRow[] | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    fetch(`/api/admin/support?${params.toString()}`).then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }

  // Search is intentionally only applied when the admin submits the search
  // form (see onSubmit below) rather than on every keystroke, so `search` is
  // deliberately excluded from this effect's dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [status]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Support Inbox</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {["", "open", "answered", "closed"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or subject…" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500" />
          <button type="submit" className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"><Search className="h-4 w-4" /></button>
        </form>
      </div>

      <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/60">
        {items === null ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No tickets found.</p>
        ) : (
          items.map((t) => (
            <Link key={t.ticket.id} href={`/admin/support/${t.ticket.id}`} className="flex items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-slate-800/50">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-semibold text-white">
                  {t.ticket.unreadForAdmin && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                  {t.ticket.subject}
                </p>
                <p className="text-xs text-slate-500">#{t.ticket.id} · {t.ticket.email} · {new Date(t.ticket.lastMessageAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-300">{t.ticket.category}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${t.ticket.status === "closed" ? "bg-slate-700 text-slate-300" : t.ticket.status === "answered" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {t.ticket.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
