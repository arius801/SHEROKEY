"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, XCircle } from "lucide-react";

type Settings = {
  storeName: string;
  storeDescription: string;
  logo: string;
  contactEmail: string;
  supportEmail: string;
  phone: string;
  social: { twitter?: string; instagram?: string; facebook?: string; telegram?: string };
  guestCheckout: boolean;
  maintenanceMode: boolean;
  minOrderMinor: number;
  taxRatePercent: number;
  paymentProviders: { stripe: boolean; paypal: boolean; bank_transfer: boolean; sandbox: boolean };
};

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      setMessage("Settings saved.");
    } else {
      setMessage("Failed to save (admin role required).");
    }
  }

  if (!settings) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-bold text-white">Payment providers (read-only — configured via environment variables)</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <ProviderStatus label="Stripe" active={settings.paymentProviders.stripe} />
          <ProviderStatus label="PayPal" active={settings.paymentProviders.paypal} />
          <ProviderStatus label="Bank Transfer" active={settings.paymentProviders.bank_transfer} />
          <ProviderStatus label="Sandbox / Test mode" active={settings.paymentProviders.sandbox} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET or PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in the environment to enable real payment processing. Sandbox mode is used automatically when no gateway is configured.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Store Name</label><input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Phone</label><input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-400">Store Description</label><textarea rows={2} value={settings.storeDescription} onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Contact Email</label><input value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Support Email</label><input value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Telegram username</label><input value={settings.social.telegram ?? ""} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, telegram: e.target.value } })} className={inputCls} placeholder="@sherokey_support" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Twitter / X</label><input value={settings.social.twitter ?? ""} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, twitter: e.target.value } })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Instagram</label><input value={settings.social.instagram ?? ""} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, instagram: e.target.value } })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Facebook</label><input value={settings.social.facebook ?? ""} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, facebook: e.target.value } })} className={inputCls} /></div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-3">
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Minimum order (USD cents)</label><input type="number" value={settings.minOrderMinor} onChange={(e) => setSettings({ ...settings, minOrderMinor: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-400">Tax rate (%)</label><input type="number" step="0.01" value={settings.taxRatePercent} onChange={(e) => setSettings({ ...settings, taxRatePercent: Number(e.target.value) })} className={inputCls} /></div>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={settings.guestCheckout} onChange={(e) => setSettings({ ...settings, guestCheckout: e.target.checked })} /> Allow guest checkout</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })} /> Maintenance mode</label>
          </div>
        </div>

        {message && <p className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200">{message}</p>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
        </button>
      </form>
    </div>
  );
}

function ProviderStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2">
      {active ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-600" />}
      <span className="text-sm text-slate-300">{label}</span>
    </div>
  );
}
