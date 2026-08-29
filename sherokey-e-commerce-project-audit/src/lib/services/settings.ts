import "server-only";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export type StoreSettings = {
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
  paymentProviders: {
    stripe: boolean;
    paypal: boolean;
    bank_transfer: boolean;
    sandbox: boolean;
  };
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "SHEROKEY",
  storeDescription: "Digital Products. Instant Delivery. Trusted by Everyone.",
  logo: "",
  contactEmail: "hello@sherokey.com",
  supportEmail: "support@sherokey.com",
  phone: "",
  social: { twitter: "", instagram: "", facebook: "", telegram: "" },
  guestCheckout: true,
  maintenanceMode: false,
  minOrderMinor: 0,
  taxRatePercent: 0,
  paymentProviders: {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    bank_transfer: true,
    sandbox: true,
  },
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (!rows[0]) return fallback;
  return rows[0].value as T;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(settingsTable)
    .values({ key, value: value as object, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: value as object, updatedAt: new Date() } });
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const stored = await getSetting<Partial<StoreSettings>>("store", {});
  const merged = { ...DEFAULT_STORE_SETTINGS, ...stored, paymentProviders: { ...DEFAULT_STORE_SETTINGS.paymentProviders, ...stored.paymentProviders } };
  // Stripe/PayPal availability is always derived from server credentials, never from
  // a stored admin toggle — the browser (and the admin UI) can only see whether the
  // provider is *reachable*, not decide payment outcomes.
  merged.paymentProviders.stripe = !!process.env.STRIPE_SECRET_KEY;
  merged.paymentProviders.paypal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  // The sandbox/test-mode instant-success flow is only ever offered when no real
  // gateway is configured, so production deployments cannot accidentally expose it.
  merged.paymentProviders.sandbox = !merged.paymentProviders.stripe && !merged.paymentProviders.paypal;
  return merged;
}
