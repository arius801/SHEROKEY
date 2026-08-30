"use client";

import { useEffect, useState } from "react";
import { Star, Check, X, Trash2 } from "lucide-react";

type ReviewRow = {
  review: {
    id: number;
    rating: number;
    title: string | null;
    comment: string | null;
    status: string;
    verifiedPurchase: boolean;
    createdAt: string;
  };
  productSlug: string | null;
  productSku: string | null;
  userEmail: string | null;
};

export default function AdminReviewsPage() {
  const [items, setItems] = useState<ReviewRow[] | null>(null);
  const [filter, setFilter] = useState("pending");

  function load() {
    const qs = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/reviews${qs}`).then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }
  useEffect(load, [filter]);

  async function moderate(id: number, status: string) {
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this review permanently?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reviews</h1>

      <div className="flex gap-2">
        {["pending", "approved", "rejected", ""].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${filter === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items === null ? (
          <p className="text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-800 py-10 text-center text-slate-500">No reviews here.</p>
        ) : (
          items.map((r) => (
            <div key={r.review.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.review.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"}`} />
                    ))}
                  </div>
                  <p className="font-semibold text-white">{r.review.title || "(no title)"}</p>
                  <p className="mt-1 text-sm text-slate-400">{r.review.comment}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {r.userEmail} · {r.productSku ?? r.productSlug} · {new Date(r.review.createdAt).toLocaleDateString()}
                    {r.review.verifiedPurchase && <span className="ms-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">Verified</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.review.status !== "approved" && (
                    <button onClick={() => moderate(r.review.id, "approved")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  {r.review.status !== "rejected" && (
                    <button onClick={() => moderate(r.review.id, "rejected")} className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  )}
                  <button onClick={() => remove(r.review.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
