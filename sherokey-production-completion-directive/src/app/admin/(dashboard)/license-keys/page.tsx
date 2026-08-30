"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

type KeyRow = {
  id: number;
  productId: number;
  variantId: number | null;
  status: string;
  maskedKey: string;
  orderId: number | null;
  soldAt: string | null;
  createdAt: string;
  productSku: string | null;
  variantSku: string | null;
};

type ProductOption = { product: { id: number; sku: string; slug: string } };

export default function AdminLicenseKeysPage() {
  const [items, setItems] = useState<KeyRow[] | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [productId, setProductId] = useState("");
  const [keysText, setKeysText] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/admin/license-keys${qs}`).then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }

  useEffect(load, [statusFilter]);
  useEffect(() => {
    fetch("/api/admin/products").then((r) => r.json()).then((d) => setProducts(d.items ?? []));
  }, []);

  async function addKeys(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !keysText.trim()) return;
    setAdding(true);
    setMessage("");
    const res = await fetch("/api/admin/license-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: Number(productId), keys: keysText }),
    });
    const data = await res.json().catch(() => ({}));
    setAdding(false);
    if (res.ok) {
      setMessage(`${data.added} key(s) added.`);
      setKeysText("");
      load();
    } else {
      setMessage("Failed to add keys.");
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this key? Sold keys will be marked invalid instead of deleted.")) return;
    await fetch(`/api/admin/license-keys/${id}`, { method: "DELETE" });
    load();
  }

  const counts = (items ?? []).reduce<Record<string, number>>((acc, k) => {
    acc[k.status] = (acc[k.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">License Inventory</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {["available", "reserved", "sold", "invalid"].map((s) => (
          <div key={s} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xl font-bold text-white">{counts[s] ?? 0}</p>
            <p className="text-xs capitalize text-slate-400">{s}</p>
          </div>
        ))}
      </div>

      <form onSubmit={addKeys} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-bold text-white">Bulk import keys</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 sm:col-span-1">
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.product.id} value={p.product.id}>{p.product.sku}</option>)}
          </select>
          <textarea value={keysText} onChange={(e) => setKeysText(e.target.value)} rows={4} placeholder="One license key per line" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 sm:col-span-2" />
        </div>
        {message && <p className="mt-2 text-sm text-emerald-400">{message}</p>}
        <button type="submit" disabled={adding} className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Keys
        </button>
      </form>

      <div className="flex gap-2">
        {["", "available", "reserved", "sold", "invalid", "refunded"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No license keys.</td></tr>
            ) : (
              items.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 text-slate-300">{k.productSku}{k.variantSku ? ` / ${k.variantSku}` : ""}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{k.maskedKey}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${k.status === "available" ? "bg-emerald-500/10 text-emerald-400" : k.status === "sold" ? "bg-indigo-500/10 text-indigo-300" : "bg-slate-500/10 text-slate-400"}`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{k.orderId ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(k.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
