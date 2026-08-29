import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getEnabledCurrencies, getDefaultCurrency } from "@/lib/services/currency";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import type { CurrencyConfig } from "@/lib/money";

export async function getRequestContext(locale: Locale) {
  const cookieStore = await cookies();
  const [user, currencies] = await Promise.all([getCurrentUser(), getEnabledCurrencies()]);

  const currencyCookie = cookieStore.get("shk_currency")?.value;
  let currency: CurrencyConfig | undefined = currencies.find((c) => c.code === currencyCookie);
  if (!currency) currency = currencies.find((c) => c.isDefault) ?? (await getDefaultCurrency());

  const theme = cookieStore.get("shk_theme")?.value === "light" ? "light" : "dark";
  const dict = getDictionary(locale);

  return { user, currencies, currency, theme: theme as "light" | "dark", dict, locale };
}

export type RequestContext = Awaited<ReturnType<typeof getRequestContext>>;
