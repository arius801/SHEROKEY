"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

const LOCALES = ["en", "ar", "ru"] as const;
const LOCALE_LABELS: Record<string, string> = { en: "English", ar: "العربية", ru: "Русский" };

type Translation = {
  locale: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string;
  whatsIncluded: string;
  systemRequirements: string;
  activationInstructions: string;
  seoTitle: string;
  seoDescription: string;
};

type Variant = {
  id?: number;
  sku: string;
  duration: string;
  region: string;
  platform: string;
  licenseType: string;
  priceMinor: number;
  comparePriceMinor: number | null;
  stock: number;
  status: string;
  names: Record<string, string>;
};

function emptyTranslation(locale: string): Translation {
  return { locale, name: "", shortDescription: "", description: "", features: "", whatsIncluded: "", systemRequirements: "", activationInstructions: "", seoTitle: "", seoDescription: "" };
}

function emptyVariant(): Variant {
  return { sku: "", duration: "", region: "", platform: "", licenseType: "", priceMinor: 0, comparePriceMinor: null, stock: 0, status: "active", names: { en: "", ar: "", ru: "" } };
}

export function ProductForm({ productId }: { productId?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!productId);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<{ id: number; slug: string; translations: { locale: string; name: string }[] }[]>([]);
  const [activeLocale, setActiveLocale] = useState<string>("en");

  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [productType, setProductType] = useState("license_key");
  const [fulfillmentType, setFulfillmentType] = useState("automatic");
  const [basePriceMinor, setBasePriceMinor] = useState(0);
  const [comparePriceMinor, setComparePriceMinor] = useState<number | "">("");
  const [status, setStatus] = useState("active");
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [stockMode, setStockMode] = useState("unlimited");
  const [image, setImage] = useState("");
  const [translations, setTranslations] = useState<Translation[]>(LOCALES.map(emptyTranslation));
  const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items ?? []));
  }, []);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.product;
        setSlug(p.slug);
        setSku(p.sku);
        setBrand(p.brand ?? "");
        setCategoryId(p.categoryId ?? "");
        setProductType(p.productType);
        setFulfillmentType(p.fulfillmentType);
        setBasePriceMinor(p.basePriceMinor);
        setComparePriceMinor(p.comparePriceMinor ?? "");
        setStatus(p.status);
        setFeatured(p.featured);
        setBestseller(p.bestseller);
        setIsNew(p.isNew);
        setStockMode(p.stockMode);
        setImage(p.image ?? "");
        setTranslations(
          LOCALES.map((locale) => {
            const tr = d.translations.find((t: { locale: string }) => t.locale === locale);
            return tr
              ? {
                  locale,
                  name: tr.name ?? "",
                  shortDescription: tr.shortDescription ?? "",
                  description: tr.description ?? "",
                  features: (tr.features ?? []).join("\n"),
                  whatsIncluded: (tr.whatsIncluded ?? []).join("\n"),
                  systemRequirements: tr.systemRequirements ?? "",
                  activationInstructions: tr.activationInstructions ?? "",
                  seoTitle: tr.seoTitle ?? "",
                  seoDescription: tr.seoDescription ?? "",
                }
              : emptyTranslation(locale);
          })
        );
        setVariants(
          d.variants.length
            ? d.variants.map((v: { id: number; sku: string; duration: string | null; region: string | null; platform: string | null; licenseType: string | null; priceMinor: number; comparePriceMinor: number | null; stock: number; status: string; translations: { locale: string; name: string }[] }) => ({
                id: v.id,
                sku: v.sku,
                duration: v.duration ?? "",
                region: v.region ?? "",
                platform: v.platform ?? "",
                licenseType: v.licenseType ?? "",
                priceMinor: v.priceMinor,
                comparePriceMinor: v.comparePriceMinor,
                stock: v.stock,
                status: v.status,
                names: Object.fromEntries(LOCALES.map((l) => [l, v.translations.find((t) => t.locale === l)?.name ?? ""])),
              }))
            : [emptyVariant()]
        );
        setLoading(false);
      });
  }, [productId]);

  function updateTranslation(locale: string, field: keyof Translation, value: string) {
    setTranslations((prev) => prev.map((t) => (t.locale === locale ? { ...t, [field]: value } : t)));
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    const variant = variants[index];
    if (variant.id) setDeletedVariantIds((prev) => [...prev, variant.id!]);
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      slug,
      sku,
      brand,
      categoryId: categoryId === "" ? null : Number(categoryId),
      productType,
      fulfillmentType,
      basePriceMinor: Number(basePriceMinor),
      comparePriceMinor: comparePriceMinor === "" ? null : Number(comparePriceMinor),
      status,
      featured,
      bestseller,
      isNew,
      stockMode,
      image: image || null,
      translations: translations
        .filter((t) => t.name.trim())
        .map((t) => ({
          locale: t.locale,
          name: t.name,
          shortDescription: t.shortDescription,
          description: t.description,
          features: t.features.split("\n").map((s) => s.trim()).filter(Boolean),
          whatsIncluded: t.whatsIncluded.split("\n").map((s) => s.trim()).filter(Boolean),
          systemRequirements: t.systemRequirements,
          activationInstructions: t.activationInstructions,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
        })),
      variants: variants
        .filter((v) => v.sku.trim())
        .map((v) => ({
          id: v.id,
          sku: v.sku,
          duration: v.duration || undefined,
          region: v.region || undefined,
          platform: v.platform || undefined,
          licenseType: v.licenseType || undefined,
          priceMinor: Number(v.priceMinor),
          comparePriceMinor: v.comparePriceMinor ? Number(v.comparePriceMinor) : null,
          stock: Number(v.stock),
          status: v.status,
          translations: LOCALES.filter((l) => v.names[l]?.trim()).map((l) => ({ locale: l, name: v.names[l] })),
        })),
      deletedVariantIds,
    };

    if (!payload.translations.length) {
      setError("At least one translation (name) is required.");
      return;
    }
    if (!payload.variants.length) {
      setError("At least one variant (SKU, price) is required.");
      return;
    }

    startSaving(async () => {
      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        setError(data?.message || data?.error || "Save failed");
      }
    });
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Slug"><input required value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} /></Field>
        <Field label="SKU"><input required value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} /></Field>
        <Field label="Brand"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} /></Field>
        <Field label="Category">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.translations.find((t) => t.locale === "en")?.name ?? c.slug}</option>
            ))}
          </select>
        </Field>
        <Field label="Product Type">
          <select value={productType} onChange={(e) => setProductType(e.target.value)} className={inputCls}>
            {["license_key", "subscription", "account", "download", "gift_card", "service"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Fulfillment">
          <select value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value)} className={inputCls}>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </Field>
        <Field label="Stock Mode">
          <select value={stockMode} onChange={(e) => setStockMode(e.target.value)} className={inputCls}>
            <option value="unlimited">Unlimited</option>
            <option value="quantity">Quantity</option>
            <option value="license_key">License Key Inventory</option>
          </select>
        </Field>
        <Field label="Base Price (USD cents)"><input type="number" required value={basePriceMinor} onChange={(e) => setBasePriceMinor(Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Compare Price (USD cents)"><input type="number" value={comparePriceMinor} onChange={(e) => setComparePriceMinor(e.target.value ? Number(e.target.value) : "")} className={inputCls} /></Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Image URL"><input value={image} onChange={(e) => setImage(e.target.value)} className={inputCls} /></Field>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} /> Bestseller</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> New</label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex gap-2">
          {LOCALES.map((l) => (
            <button type="button" key={l} onClick={() => setActiveLocale(l)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${activeLocale === l ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
        {translations.filter((t) => t.locale === activeLocale).map((t) => (
          <div key={t.locale} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input value={t.name} onChange={(e) => updateTranslation(t.locale, "name", e.target.value)} className={inputCls} /></Field>
            <Field label="Short Description"><input value={t.shortDescription} onChange={(e) => updateTranslation(t.locale, "shortDescription", e.target.value)} className={inputCls} /></Field>
            <Field label="Description" full><textarea rows={4} value={t.description} onChange={(e) => updateTranslation(t.locale, "description", e.target.value)} className={inputCls} /></Field>
            <Field label="Features (one per line)"><textarea rows={3} value={t.features} onChange={(e) => updateTranslation(t.locale, "features", e.target.value)} className={inputCls} /></Field>
            <Field label="What's Included (one per line)"><textarea rows={3} value={t.whatsIncluded} onChange={(e) => updateTranslation(t.locale, "whatsIncluded", e.target.value)} className={inputCls} /></Field>
            <Field label="System Requirements"><textarea rows={2} value={t.systemRequirements} onChange={(e) => updateTranslation(t.locale, "systemRequirements", e.target.value)} className={inputCls} /></Field>
            <Field label="Activation Instructions"><textarea rows={2} value={t.activationInstructions} onChange={(e) => updateTranslation(t.locale, "activationInstructions", e.target.value)} className={inputCls} /></Field>
            <Field label="SEO Title"><input value={t.seoTitle} onChange={(e) => updateTranslation(t.locale, "seoTitle", e.target.value)} className={inputCls} /></Field>
            <Field label="SEO Description"><input value={t.seoDescription} onChange={(e) => updateTranslation(t.locale, "seoDescription", e.target.value)} className={inputCls} /></Field>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Variants</h3>
          <button type="button" onClick={() => setVariants((v) => [...v, emptyVariant()])} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
            <Plus className="h-3.5 w-3.5" /> Add Variant
          </button>
        </div>
        <div className="space-y-4">
          {variants.map((v, i) => (
            <div key={i} className="rounded-xl border border-slate-800 p-4">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Field label="SKU"><input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className={inputCls} /></Field>
                <Field label="Duration"><input value={v.duration} onChange={(e) => updateVariant(i, { duration: e.target.value })} className={inputCls} /></Field>
                <Field label="Region"><input value={v.region} onChange={(e) => updateVariant(i, { region: e.target.value })} className={inputCls} /></Field>
                <Field label="Platform"><input value={v.platform} onChange={(e) => updateVariant(i, { platform: e.target.value })} className={inputCls} /></Field>
                <Field label="Price (cents)"><input type="number" value={v.priceMinor} onChange={(e) => updateVariant(i, { priceMinor: Number(e.target.value) })} className={inputCls} /></Field>
                <Field label="Stock"><input type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className={inputCls} /></Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {LOCALES.map((l) => (
                  <Field key={l} label={`Name (${LOCALE_LABELS[l]})`}>
                    <input value={v.names[l] ?? ""} onChange={(e) => updateVariant(i, { names: { ...v.names, [l]: e.target.value } })} className={inputCls} />
                  </Field>
                ))}
              </div>
              <button type="button" onClick={() => removeVariant(i)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300">
                <Trash2 className="h-3.5 w-3.5" /> Remove variant
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>}

      <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Product
      </button>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  );
}
