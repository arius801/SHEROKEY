"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { priceLabels } from "@/lib/price-label";
import type { CurrencyConfig } from "@/lib/money";

type Variant = {
  id: number;
  name: string;
  priceMinor: number;
  comparePriceMinor: number | null;
  stock: number;
};

export function VariantSelector({
  variants,
  stockMode,
  currency,
  locale,
  labels,
}: {
  variants: Variant[];
  stockMode: string;
  currency: CurrencyConfig;
  locale: string;
  labels: { selectVariant: string; addToCart: string; added: string; error: string; outOfStock: string; quantity: string };
}) {
  const [selectedId, setSelectedId] = useState<number | null>(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const selected = useMemo(() => variants.find((v) => v.id === selectedId) ?? null, [variants, selectedId]);
  const outOfStock = stockMode === "quantity" && !!selected && selected.stock <= 0;

  const { price, compare } = selected
    ? priceLabels(selected.priceMinor, selected.comparePriceMinor, currency, locale)
    : { price: "", compare: null as string | null };

  return (
    <div className="space-y-5">
      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-[--color-fg]">{labels.selectVariant}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  v.id === selectedId
                    ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]"
                    : "border-[--color-border] text-[--color-fg] hover:border-[--color-primary]/50"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-[--color-fg]">{price}</span>
        {compare && <span className="text-base text-[--color-muted] line-through">{compare}</span>}
      </div>

      {outOfStock ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400">{labels.outOfStock}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-[--color-border]">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-[--color-fg]">
              −
            </button>
            <span className="w-10 text-center text-sm font-semibold text-[--color-fg]">{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(10, q + 1))} className="px-3 py-2.5 text-[--color-fg]">
              +
            </button>
          </div>
          <AddToCartButton variantId={selected?.id ?? null} quantity={quantity} label={labels.addToCart} addedLabel={labels.added} errorLabel={labels.error} className="flex-1 sm:flex-none" />
        </div>
      )}
    </div>
  );
}
