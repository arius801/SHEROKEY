import { formatUsdMinorAs, type CurrencyConfig } from "@/lib/money";

export function priceLabels(usdMinor: number, compareUsdMinor: number | null, currency: CurrencyConfig, locale: string) {
  return {
    price: formatUsdMinorAs(usdMinor, currency, locale),
    compare: compareUsdMinor ? formatUsdMinorAs(compareUsdMinor, currency, locale) : null,
  };
}
