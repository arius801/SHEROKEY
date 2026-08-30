export type CurrencyConfig = {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number; // units of this currency per 1 USD
  decimals: number;
  symbolPosition: "before" | "after";
  enabled: boolean;
  isDefault: boolean;
};

const NUMBER_LOCALE: Record<string, string> = {
  USD: "en-US",
  SAR: "ar-SA",
  RUB: "ru-RU",
};

/** Convert a USD minor-unit amount (cents) into the target currency's minor units. */
export function convertMinor(usdMinor: number, currency: Pick<CurrencyConfig, "exchangeRate" | "decimals">): number {
  const usd = usdMinor / 100;
  const converted = usd * currency.exchangeRate;
  const factor = Math.pow(10, currency.decimals);
  return Math.round(converted * factor);
}

export function formatMinor(minorAmount: number, currency: Pick<CurrencyConfig, "code" | "symbol" | "decimals" | "symbolPosition">, locale = "en"): string {
  const factor = Math.pow(10, currency.decimals);
  const value = minorAmount / factor;
  const numberLocale = locale === "ar" ? "ar-SA" : NUMBER_LOCALE[currency.code] || "en-US";
  const formatted = new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(value);

  return currency.symbolPosition === "after" ? `${formatted} ${currency.symbol}` : `${currency.symbol}${formatted}`;
}

/** Convert + format a base USD minor amount directly. */
export function formatUsdMinorAs(usdMinor: number, currency: CurrencyConfig, locale = "en"): string {
  const converted = convertMinor(usdMinor, currency);
  return formatMinor(converted, currency, locale);
}

export function toMinorUnits(amount: number, decimals = 2): number {
  return Math.round(amount * Math.pow(10, decimals));
}
