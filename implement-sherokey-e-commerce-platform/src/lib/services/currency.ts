import "server-only";
import { db } from "@/db";
import { currencies } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { CurrencyConfig } from "@/lib/money";

function toConfig(row: typeof currencies.$inferSelect): CurrencyConfig {
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    exchangeRate: Number(row.exchangeRate),
    decimals: row.decimals,
    symbolPosition: row.symbolPosition === "after" ? "after" : "before",
    enabled: row.enabled,
    isDefault: row.isDefault,
  };
}

export async function getEnabledCurrencies(): Promise<CurrencyConfig[]> {
  const rows = await db.select().from(currencies).where(eq(currencies.enabled, true));
  return rows.map(toConfig);
}

export async function getAllCurrencies(): Promise<CurrencyConfig[]> {
  const rows = await db.select().from(currencies);
  return rows.map(toConfig);
}

export async function getCurrencyByCode(code: string): Promise<CurrencyConfig | null> {
  const rows = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  return rows[0] ? toConfig(rows[0]) : null;
}

export async function getDefaultCurrency(): Promise<CurrencyConfig> {
  const rows = await db.select().from(currencies).where(eq(currencies.isDefault, true)).limit(1);
  if (rows[0]) return toConfig(rows[0]);
  return { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, decimals: 2, symbolPosition: "before", enabled: true, isDefault: true };
}
