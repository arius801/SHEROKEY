"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type ProductRow = {
  product: {
    id: number;
    slug: string;
    sku: string;
    status: string;
    basePriceMinor: number;
    stockMode: string;
    featured: boolean;
  };
  categoryName: string | null;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductRow[] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function load() {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }

  useEffect(load, []);

  async function remove(id: number) {
    if (!confirm("Delete this product? Products with existing orders will be archived instead.")) return;
    setDeletingId(id);
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <Link href="/admin/products/new" className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No products yet.</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.product.id}>
                  <td className="px-4 py-3 text-slate-300">{row.product.sku}</td>
                  <td className="px-4 py-3 text-slate-300">{row.product.slug}</td>
                  <td className="px-4 py-3 text-slate-400">{row.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">${(row.product.basePriceMinor / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400">{row.product.stockMode}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${row.product.status === "active" ? "bg-emerald-500/10 text-emerald-400" : row.product.status === "draft" ? "bg-amber-500/10 text-amber-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {row.product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/products/${row.product.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(row.product.id)} disabled={deletingId === row.product.id} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10">
                        {deletingId === row.product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
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
