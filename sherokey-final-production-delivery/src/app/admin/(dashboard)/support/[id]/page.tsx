"use client";

import { useEffect, useState, useTransition, use as usePromise } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Lock, ShieldCheck, User } from "lucide-react";

type Ticket = {
  id: number;
  email: string;
  name: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
};

type Reply = { id: number; authorRole: string; authorName: string | null; message: string; internal: boolean; createdAt: string };

export default function AdminSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/admin/support/${id}`).then((r) => r.json()).then((d) => {
      setTicket(d.ticket);
      setReplies(d.replies ?? []);
    });
  }
  useEffect(load, [id]);

  function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    startTransition(async () => {
      await fetch(`/api/admin/support/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, internal }) });
      setMessage("");
      load();
    });
  }

  async function updateStatus(status: string) {
    await fetch(`/api/admin/support/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  if (!ticket) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to inbox
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
          <p className="text-sm text-slate-400">#{ticket.id} · {ticket.email} · {ticket.category}</p>
        </div>
        <select value={ticket.status} onChange={(e) => updateStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500">
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <Bubble authorRole="customer" authorName={ticket.name || ticket.email} message={ticket.message} createdAt={ticket.createdAt} internal={false} />
        {replies.map((r) => (
          <Bubble key={r.id} authorRole={r.authorRole} authorName={r.authorName} message={r.message} createdAt={r.createdAt} internal={r.internal} />
        ))}
      </div>

      <form onSubmit={reply} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Write a reply to the customer…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        />
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (not visible to customer)
          </label>
          <button type="submit" disabled={pending || !message.trim()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ authorRole, authorName, message, createdAt, internal }: { authorRole: string; authorName: string | null; message: string; createdAt: string; internal: boolean }) {
  const isAdmin = authorRole === "admin";
  return (
    <div className={`rounded-xl border p-4 ${internal ? "border-amber-500/30 bg-amber-500/5" : isAdmin ? "border-indigo-500/30 bg-indigo-500/5" : "border-slate-800 bg-slate-950"}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
        {internal ? <Lock className="h-3.5 w-3.5" /> : isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        {authorName || (isAdmin ? "Support" : "Customer")}
        {internal && <span className="text-amber-400">(internal note)</span>}
        <span className="ms-auto font-normal text-slate-500">{new Date(createdAt).toLocaleString()}</span>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-200">{message}</p>
    </div>
  );
}
