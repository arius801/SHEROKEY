"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

const LOCALES = ["en", "ar", "ru"] as const;
const LOCALE_LABELS: Record<string, string> = { en: "English", ar: "العربية", ru: "Русский" };

type Category = {
  id: number;
  slug: string;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  status: string;
  translations: { locale: string; name: string; description: string | null }[];
};

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

function emptyForm() {
  return {
    id: null as number | null,
    slug: "",
    icon: "sparkles",
    image: "",
    sortOrder: 0,
    status: "active",
    names: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string>,
    descriptions: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string>,
  };
}

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }
  useEffect(load, []);

  function edit(c: Category) {
    setForm({
      id: c.id,
      slug: c.slug,
      icon: c.icon ?? "sparkles",
      image: c.image ?? "",
      sortOrder: c.sortOrder,
      status: c.status,
      names: Object.fromEntries(LOCALES.map((l) => [l, c.translations.find((t) => t.locale === l)?.name ?? ""])),
      descriptions: Object.fromEntries(LOCALES.map((l) => [l, c.translations.find((t) => t.locale === l)?.description ?? ""])),
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSaving(true);
    const payload = {
      slug: form.slug,
      icon: form.icon,
      image: form.image || null,
      sortOrder: Number(form.sortOrder),
      status: form.status,
      translations: LOCALES.filter((l) => form.names[l]?.trim()).map((l) => ({ locale: l, name: form.names[l], description: form.descriptions[l] })),
    };
    if (!payload.translations.length) {
      setError("At least one name is required.");
      setSaving(false);
      return;
    }
    const res = await fetch(form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setForm(null);
      load();
    } else {
      setError("Save failed");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this category? Categories with products will be hidden instead.")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Categories</h1>
        <button onClick={() => setForm(emptyForm())} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name (EN)</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No categories yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-slate-300">{c.translations.find((t) => t.locale === "en")?.name ?? c.slug}</td>
                  <td className="px-4 py-3 text-slate-400">{c.slug}</td>
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
              <h2 className="text-lg font-bold text-white">{form.id ? "Edit Category" : "New Category"}</h2>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Slug</label>
                  <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Icon (lucide name)</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              {LOCALES.map((l) => (
                <div key={l} className="rounded-xl border border-slate-800 p-3">
                  <p className="mb-2 text-xs font-bold text-indigo-400">{LOCALE_LABELS[l]}</p>
                  <input placeholder="Name" value={form.names[l]} onChange={(e) => setForm({ ...form, names: { ...form.names, [l]: e.target.value } })} className={`${inputCls} mb-2`} />
                  <textarea placeholder="Description" rows={2} value={form.descriptions[l]} onChange={(e) => setForm({ ...form, descriptions: { ...form.descriptions, [l]: e.target.value } })} className={inputCls} />
                </div>
              ))}
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
