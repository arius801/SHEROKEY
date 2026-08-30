"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ShieldCheck, User } from "lucide-react";

export type ChatReply = {
  id: number;
  authorRole: string;
  authorName: string | null;
  message: string;
  createdAt: string;
};

export function SupportChat({
  locale,
  ticketId,
  email,
  subject,
  status,
  initialReplies,
  labels,
}: {
  locale: string;
  ticketId: number;
  email: string;
  subject: string;
  status: string;
  initialReplies: ChatReply[];
  labels: {
    backToTickets: string;
    replyPlaceholder: string;
    sendReply: string;
    genericError: string;
    ticketStatuses: Record<string, string>;
  };
}) {
  const [replies, setReplies] = useState(initialReplies);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email }),
      });
      if (res.ok) {
        setReplies((prev) => [
          ...prev,
          { id: Date.now(), authorRole: "customer", authorName: "You", message, createdAt: new Date().toISOString() },
        ]);
        setMessage("");
        router.refresh();
      } else {
        setError(labels.genericError);
      }
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-[--color-border] bg-[--color-card]">
      <div className="flex items-center justify-between border-b border-[--color-border] px-5 py-4">
        <div>
          <p className="font-semibold text-[--color-fg]">{subject}</p>
          <p className="text-xs text-[--color-muted]">#{ticketId}</p>
        </div>
        <span className="rounded-full border border-[--color-border] px-3 py-1 text-[11px] font-bold uppercase text-[--color-muted]">
          {labels.ticketStatuses[status] ?? status}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {replies.length === 0 && <p className="text-center text-sm text-[--color-muted]">—</p>}
        {replies.map((r) => {
          const isAdmin = r.authorRole === "admin";
          return (
            <div key={r.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isAdmin ? "bg-[--color-bg] border border-[--color-border] text-[--color-fg]" : "bg-[--color-primary] text-white"}`}>
                <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold opacity-80 ${isAdmin ? "" : "justify-end"}`}>
                  {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {r.authorName || (isAdmin ? "Support" : "You")}
                </div>
                <p className="whitespace-pre-line leading-relaxed">{r.message}</p>
                <p className={`mt-1 text-[10px] opacity-70`}>{new Date(r.createdAt).toLocaleString(locale)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-[--color-border] p-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={labels.replyPlaceholder}
          className="flex-1 rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
        <button
          type="submit"
          disabled={pending || !message.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary] text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
