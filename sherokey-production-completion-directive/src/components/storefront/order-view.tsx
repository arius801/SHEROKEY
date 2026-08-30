"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, PackageX } from "lucide-react";
import { RevealKey } from "@/components/storefront/reveal-key";
import { priceLabels } from "@/lib/price-label";
import type { CurrencyConfig } from "@/lib/money";

export type OrderDeliveryData = {
  id: number;
  licenseKeyId: number | null;
  key: string | null;
  downloadUrl: string | null;
  instructions: string | null;
  deliveredAt: Date | string | null;
};

export type OrderItemData = {
  id: number;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  fulfillmentStatus: string;
  deliveries: OrderDeliveryData[];
};

export type OrderData = {
  order: {
    orderNumber: string;
    email: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
    currency: string;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    createdAt: Date | string;
  };
  items: OrderItemData[];
};

const currencyFallback: CurrencyConfig = { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, decimals: 2, symbolPosition: "before", enabled: true, isDefault: true };

export function OrderView({
  initialOrder,
  orderNumber,
  locale,
  labels,
}: {
  initialOrder: OrderData | null;
  orderNumber: string;
  locale: string;
  labels: {
    orderNumber: string;
    paymentStatus: string;
    deliveryStatus: string;
    yourDigitalProducts: string;
    reveal: string;
    copy: string;
    copied: string;
    activationInstructions: string;
    pendingManualFulfillment: string;
    lookupTitle: string;
    lookupEmail: string;
    lookupSubmit: string;
    lookupNotFound: string;
    subtotal: string;
    discount: string;
    total: string;
    statuses: Record<string, string>;
  };
}) {
  const [order, setOrder] = useState<OrderData | null>(initialOrder);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError(labels.lookupNotFound);
      }
    });
  }

  if (!order) {
    return (
      <form onSubmit={lookup} className="mx-auto max-w-md rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
        <h2 className="mb-4 text-lg font-bold text-[--color-fg]">{labels.lookupTitle}</h2>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.lookupEmail}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-[--color-primary] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
          {labels.lookupSubmit}
        </button>
      </form>
    );
  }

  const currency: CurrencyConfig = { ...currencyFallback, code: order.order.currency };
  const { price: totalLabel } = priceLabels(order.order.totalMinor, null, currency, locale);
  const { price: subtotalLabel } = priceLabels(order.order.subtotalMinor, null, currency, locale);
  const { price: discountLabel } = priceLabels(order.order.discountMinor, null, currency, locale);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[--color-muted]">{labels.orderNumber}</p>
            <p className="text-lg font-bold text-[--color-fg]">#{order.order.orderNumber}</p>
          </div>
          <div className="flex gap-2">
            <StatusPill label={labels.paymentStatus} value={order.order.paymentStatus} labels={labels.statuses} />
            <StatusPill label={labels.deliveryStatus} value={order.order.deliveryStatus} labels={labels.statuses} />
          </div>
        </div>
        <div className="mt-4 space-y-1.5 border-t border-[--color-border] pt-4 text-sm">
          <div className="flex justify-between text-[--color-muted]">
            <span>{labels.subtotal}</span>
            <span>{subtotalLabel}</span>
          </div>
          {order.order.discountMinor > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>{labels.discount}</span>
              <span>-{discountLabel}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-[--color-fg]">
            <span>{labels.total}</span>
            <span>{totalLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-[--color-fg]">{labels.yourDigitalProducts}</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[--color-fg]">{item.productNameSnapshot}</p>
                  <p className="text-xs text-[--color-muted]">
                    {item.variantNameSnapshot} × {item.quantity}
                  </p>
                </div>
                {item.fulfillmentStatus === "delivered" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : item.fulfillmentStatus === "failed" ? (
                  <PackageX className="h-5 w-5 shrink-0 text-rose-400" />
                ) : (
                  <Clock className="h-5 w-5 shrink-0 text-amber-400" />
                )}
              </div>

              {item.deliveries.length === 0 && item.fulfillmentStatus !== "delivered" && (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">{labels.pendingManualFulfillment}</p>
              )}

              {item.deliveries.map((d) => (
                <div key={d.id} className="mt-3 space-y-2">
                  {d.key && <RevealKey value={d.key} revealLabel={labels.reveal} copyLabel={labels.copy} copiedLabel={labels.copied} />}
                  {d.downloadUrl && (
                    <a href={d.downloadUrl} className="block text-sm font-semibold text-[--color-primary] hover:underline">
                      {d.downloadUrl}
                    </a>
                  )}
                  {d.instructions && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-[--color-muted]">{labels.activationInstructions}</p>
                      <p className="text-xs text-[--color-muted]">{d.instructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value, labels }: { label: string; value: string; labels: Record<string, string> }) {
  const tone = value === "paid" || value === "delivered" || value === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : value === "failed" || value === "cancelled" ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${tone}`} title={label}>
      {labels[value] ?? value}
    </span>
  );
}
