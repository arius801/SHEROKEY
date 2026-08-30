"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

type Coupon = {
  id: number;
  code: string;
  description: string | null;
  type: string;
  value: string;
  minimumOrderMinor: number;
  maximumDiscountMinor: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: string;
};

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

function emptyForm() {
  return { id: null as number | null, code: "", description: "", type: "percentage", value: "10", minimumOrderMinor: 0, maximumDiscountMinor: "", usageLimit: "", perUserLimit: "1", startsAt: "", expiresAt: "", status: "active" };
}

export default function AdminCouponsPage() {
  const [items, setItems] = useState<Coupon[] | null>(null);
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/coupons").then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }
  useEffect(load, []);

  function edit(c: Coupon) {
    setForm({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: c.value,
      minimumOrderMinor: c.minimumOrderMinor,
      maximumDiscountMinor: c.maximumDiscountMinor ? String(c.maximumDiscountMinor) : "",
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : "1",
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      status: c.status,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSaving(true);
    const payload = {
      code: form.code,
      description: form.description,
      type: form.type,
      value: Number(form.value),
      minimumOrderMinor: Number(form.minimumOrderMinor),
      maximumDiscountMinor: form.maximumDiscountMinor ? Number(form.maximumDiscountMinor) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : 1,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      status: form.status,
    };
    const res = await fetch(form.id ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setForm(null);
      load();
    } else {
      setError("Save failed. Code may already exist.");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
        <button onClick={() => setForm(emptyForm())} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> New Coupon
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No coupons yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">{c.code}</td>
                  <td className="px-4 py-3 text-slate-400">{c.type}</td>
                  <td className="px-4 py-3 text-slate-300">{c.type === "percentage" ? `${c.value}%` : `$${c.value}`}</td>
                  <td className="px-4 py-3 text-slate-400">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</td>
                  <td className="px-4 py-3 text-slate-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => edit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{form.id ? "Edit Coupon" : "New Coupon"}</h2>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Code</label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount (USD)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Value ({form.type === "percentage" ? "%" : "USD"})</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Min order (cents)</label>
                  <input type="number" value={form.minimumOrderMinor} onChange={(e) => setForm({ ...form, minimumOrderMinor: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Max discount (cents)</label>
                  <input type="number" value={form.maximumDiscountMinor} onChange={(e) => setForm({ ...form, maximumDiscountMinor: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Usage limit (total)</label>
                  <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Per-user limit</label>
                  <input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Starts</label>
                  <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Expires</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputCls} />
                </div>
              </div>
              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
