"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast-provider";

export function ReviewForm({
  productId,
  labels,
}: {
  productId: number;
  labels: { rating: string; title: string; comment: string; submit: string; thankYou: string };
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment }),
      });
      if (res.ok) {
        setDone(true);
        push(labels.thankYou, "success");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        push(data?.error === "ALREADY_REVIEWED" ? "You already reviewed this product" : "Unable to submit review", "error");
      }
    });
  }

  if (done) {
    return <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{labels.thankYou}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
      <div>
        <p className="mb-1.5 text-sm font-semibold text-[--color-fg]">{labels.rating}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}>
              <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-[--color-border]"}`} />
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={labels.title}
        className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={labels.comment}
        rows={3}
        className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[--color-primary] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {labels.submit}
      </button>
    </form>
  );
}
