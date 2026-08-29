export type SaleWindow = {
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
};

export function isSaleActive(item: SaleWindow): boolean {
  const now = Date.now();
  const start = item.saleStartsAt ? new Date(item.saleStartsAt).getTime() : null;
  const end = item.saleEndsAt ? new Date(item.saleEndsAt).getTime() : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function discountPercent(priceMinor: number, compareMinor: number | null | undefined): number {
  if (!compareMinor || compareMinor <= priceMinor) return 0;
  return Math.round(((compareMinor - priceMinor) / compareMinor) * 100);
}

export function effectivePrice(params: {
  priceMinor: number;
  comparePriceMinor?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
}): { priceMinor: number; comparePriceMinor: number | null; discountPercent: number; onSale: boolean } {
  const active = isSaleActive(params);
  const compare = active ? params.comparePriceMinor ?? null : null;
  const pct = compare ? discountPercent(params.priceMinor, compare) : 0;
  return {
    priceMinor: params.priceMinor,
    comparePriceMinor: pct > 0 ? compare : null,
    discountPercent: pct,
    onSale: pct > 0,
  };
}
