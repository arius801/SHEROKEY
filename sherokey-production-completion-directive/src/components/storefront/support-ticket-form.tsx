"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export function SupportTicketForm({
  locale,
  defaultEmail,
  defaultName,
  labels,
}: {
  locale: string;
  defaultEmail: string;
  defaultName: string;
  labels: {
    name: string;
    email: string;
    orderNumber: string;
    category: string;
    subject: string;
    message: string;
    send: string;
    sent: string;
    categories: Record<string, string>;
    genericError: string;
  };
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [orderNumber, setOrderNumber] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, orderNumber: orderNumber || undefined, category, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          router.push(`/${locale}/account/support/${data.ticketId}?email=${encodeURIComponent(email)}`);
        }, 900);
      } else {
        setError(data?.error || labels.genericError);
      }
    });
  }

  if (sent) {
    return <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">{labels.sent}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.orderNumber}</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="SHK-2026-000123"
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.category}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          >
            {Object.entries(labels.categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.subject}</label>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.message}</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
      </div>
      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {labels.send}
      </button>
    </form>
  );
}
