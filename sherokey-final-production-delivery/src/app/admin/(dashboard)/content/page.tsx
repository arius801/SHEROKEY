"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

const LOCALES = ["en", "ar", "ru"] as const;
const LOCALE_LABELS: Record<string, string> = { en: "English", ar: "العربية", ru: "Русский" };
const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

type ContentPage = { id: number; slug: string; status: string; translations: { locale: string; title: string; content: string }[] };
type Faq = { id: number; category: string; sortOrder: number; status: string; translations: { locale: string; question: string; answer: string }[] };

function emptyPageForm() {
  return { id: null as number | null, slug: "", status: "active", titles: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string>, contents: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string> };
}
function emptyFaqForm() {
  return { id: null as number | null, category: "orders", sortOrder: 0, status: "active", questions: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string>, answers: Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<string, string> };
}

export default function AdminContentPage() {
  const [tab, setTab] = useState<"pages" | "faqs">("pages");
  const [pages, setPages] = useState<ContentPage[] | null>(null);
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [pageForm, setPageForm] = useState<ReturnType<typeof emptyPageForm> | null>(null);
  const [faqForm, setFaqForm] = useState<ReturnType<typeof emptyFaqForm> | null>(null);
  const [saving, setSaving] = useState(false);

  function loadPages() {
    fetch("/api/admin/content").then((r) => r.json()).then((d) => setPages(d.items ?? []));
  }
  function loadFaqs() {
    fetch("/api/admin/faqs").then((r) => r.json()).then((d) => setFaqs(d.items ?? []));
  }
  useEffect(() => { loadPages(); loadFaqs(); }, []);

  function editPage(p: ContentPage) {
    setPageForm({
      id: p.id,
      slug: p.slug,
      status: p.status,
      titles: Object.fromEntries(LOCALES.map((l) => [l, p.translations.find((t) => t.locale === l)?.title ?? ""])),
      contents: Object.fromEntries(LOCALES.map((l) => [l, p.translations.find((t) => t.locale === l)?.content ?? ""])),
    });
  }

  async function savePage(e: React.FormEvent) {
    e.preventDefault();
    if (!pageForm) return;
    setSaving(true);
    const payload = { slug: pageForm.slug, status: pageForm.status, translations: LOCALES.filter((l) => pageForm.titles[l]).map((l) => ({ locale: l, title: pageForm.titles[l], content: pageForm.contents[l] })) };
    const res = await fetch(pageForm.id ? `/api/admin/content/${pageForm.id}` : "/api/admin/content", { method: pageForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setPageForm(null); loadPages(); }
  }

  async function deletePage(id: number) {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    loadPages();
  }

  function editFaq(f: Faq) {
    setFaqForm({
      id: f.id,
      category: f.category,
      sortOrder: f.sortOrder,
      status: f.status,
      questions: Object.fromEntries(LOCALES.map((l) => [l, f.translations.find((t) => t.locale === l)?.question ?? ""])),
      answers: Object.fromEntries(LOCALES.map((l) => [l, f.translations.find((t) => t.locale === l)?.answer ?? ""])),
    });
  }

  async function saveFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!faqForm) return;
    setSaving(true);
    const payload = {
      category: faqForm.category,
      sortOrder: Number(faqForm.sortOrder),
      status: faqForm.status,
      translations: LOCALES.filter((l) => faqForm.questions[l]).map((l) => ({ locale: l, question: faqForm.questions[l], answer: faqForm.answers[l] })),
    };
    const res = await fetch(faqForm.id ? `/api/admin/faqs/${faqForm.id}` : "/api/admin/faqs", { method: faqForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setFaqForm(null); loadFaqs(); }
  }

  async function deleteFaq(id: number) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    loadFaqs();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Content</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("pages")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === "pages" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>Legal Pages</button>
        <button onClick={() => setTab("faqs")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === "faqs" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>FAQs</button>
      </div>

      {tab === "pages" ? (
        <div className="space-y-4">
          <button onClick={() => setPageForm(emptyPageForm())} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> New Page</button>
          <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/60">
            {(pages ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-white">{p.translations.find((t) => t.locale === "en")?.title ?? p.slug}</p>
                  <p className="text-xs text-slate-500">/{p.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editPage(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deletePage(p.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {pages?.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No pages yet. Legal pages fall back to built-in defaults until created here.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setFaqForm(emptyFaqForm())} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> New FAQ</button>
          <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/60">
            {(faqs ?? []).map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-white">{f.translations.find((t) => t.locale === "en")?.question ?? "(untitled)"}</p>
                  <p className="text-xs text-slate-500">{f.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editFaq(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteFaq(f.id)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {faqs?.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No FAQs yet.</p>}
          </div>
        </div>
      )}

      {pageForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{pageForm.id ? "Edit Page" : "New Page"}</h2>
              <button onClick={() => setPageForm(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={savePage} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-400">Slug</label><input required value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} className={inputCls} placeholder="terms-of-service" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-400">Status</label>
                  <select value={pageForm.status} onChange={(e) => setPageForm({ ...pageForm, status: e.target.value })} className={inputCls}><option value="active">Active</option><option value="hidden">Hidden</option></select>
                </div>
              </div>
              {LOCALES.map((l) => (
                <div key={l} className="rounded-xl border border-slate-800 p-3">
                  <p className="mb-2 text-xs font-bold text-indigo-400">{LOCALE_LABELS[l]}</p>
                  <input placeholder="Title" value={pageForm.titles[l]} onChange={(e) => setPageForm({ ...pageForm, titles: { ...pageForm.titles, [l]: e.target.value } })} className={`${inputCls} mb-2`} />
                  <textarea placeholder="Content" rows={5} value={pageForm.contents[l]} onChange={(e) => setPageForm({ ...pageForm, contents: { ...pageForm.contents, [l]: e.target.value } })} className={inputCls} />
                </div>
              ))}
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
            </form>
          </div>
        </div>
      )}

      {faqForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{faqForm.id ? "Edit FAQ" : "New FAQ"}</h2>
              <button onClick={() => setFaqForm(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveFaq} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-400">Category</label>
                  <select value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} className={inputCls}>
                    {["orders", "payments", "delivery", "licenses", "subscriptions", "refunds", "account", "technical"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-400">Sort Order</label><input type="number" value={faqForm.sortOrder} onChange={(e) => setFaqForm({ ...faqForm, sortOrder: Number(e.target.value) })} className={inputCls} /></div>
              </div>
              {LOCALES.map((l) => (
                <div key={l} className="rounded-xl border border-slate-800 p-3">
                  <p className="mb-2 text-xs font-bold text-indigo-400">{LOCALE_LABELS[l]}</p>
                  <input placeholder="Question" value={faqForm.questions[l]} onChange={(e) => setFaqForm({ ...faqForm, questions: { ...faqForm.questions, [l]: e.target.value } })} className={`${inputCls} mb-2`} />
                  <textarea placeholder="Answer" rows={3} value={faqForm.answers[l]} onChange={(e) => setFaqForm({ ...faqForm, answers: { ...faqForm.answers, [l]: e.target.value } })} className={inputCls} />
                </div>
              ))}
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
