"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { CartLineItem } from "@/lib/services/cart";
import { priceLabels } from "@/lib/price-label";
import type { CurrencyConfig } from "@/lib/money";

export function CartItemRow({
  item,
  currency,
  locale,
  removeLabel,
}: {
  item: CartLineItem;
  currency: CurrencyConfig;
  locale: string;
  removeLabel: string;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const { price } = priceLabels(item.unitPriceMinor, null, currency, locale);
  const { price: lineTotal } = priceLabels(item.unitPriceMinor * quantity, null, currency, locale);

  function updateQuantity(next: number) {
    setQuantity(next);
    startTransition(async () => {
      await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await fetch(`/api/cart/items/${item.id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 border-b border-[--color-border] py-5 last:border-0">
      <Link href={`/${locale}/products/${item.slug}`} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-black text-[--color-primary]/30">{item.name.slice(0, 2).toUpperCase()}</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/${locale}/products/${item.slug}`} className="line-clamp-1 text-sm font-semibold text-[--color-fg] hover:text-[--color-primary]">
          {item.name}
        </Link>
        <p className="text-xs text-[--color-muted]">{item.variantName}</p>
        <p className="mt-1 text-sm font-bold text-[--color-fg]">{price}</p>
      </div>
      <div className="flex items-center rounded-lg border border-[--color-border]">
        <button disabled={pending} onClick={() => updateQuantity(Math.max(1, quantity - 1))} className="px-2.5 py-1.5 text-[--color-fg]">
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold text-[--color-fg]">{quantity}</span>
        <button disabled={pending} onClick={() => updateQuantity(quantity + 1)} className="px-2.5 py-1.5 text-[--color-fg]">
          +
        </button>
      </div>
      <div className="hidden w-20 text-end text-sm font-bold text-[--color-fg] sm:block">{lineTotal}</div>
      <button disabled={pending} onClick={remove} aria-label={removeLabel} className="text-[--color-muted] hover:text-rose-400">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
