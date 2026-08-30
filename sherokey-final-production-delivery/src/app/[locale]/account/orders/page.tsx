import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Package } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listOrdersForUser } from "@/lib/services/orders";
import { AccountShell } from "@/components/storefront/account-shell";
import { priceLabels } from "@/lib/price-label";

export const revalidate = 0;

export default async function AccountOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (!ctx.user) redirect(`/${locale}/login?redirect=/${locale}/account/orders`);
  const dict = ctx.dict;

  const orders = await listOrdersForUser(ctx.user.id);

  return (
    <AccountShell locale={locale} dict={dict} active="orders">
      <h1 className="mb-6 text-xl font-bold text-[--color-fg]">{dict.account.orders}</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[--color-border] py-16 text-center">
          <Package className="mb-3 h-9 w-9 text-[--color-muted]" />
          <p className="font-semibold text-[--color-fg]">{dict.account.noOrders}</p>
          <p className="text-sm text-[--color-muted]">{dict.account.noOrdersDesc}</p>
        </div>
      ) : (
        <div className="divide-y divide-[--color-border] rounded-2xl border border-[--color-border] bg-[--color-card]">
          {orders.map((o) => {
            const { price } = priceLabels(o.totalMinor, null, { code: o.currency, name: o.currency, symbol: "", exchangeRate: 1, decimals: 2, symbolPosition: "before", enabled: true, isDefault: false }, locale);
            return (
              <Link
                key={o.id}
                href={`/${locale}/order/${o.orderNumber}?email=${encodeURIComponent(ctx.user!.email)}`}
                className="flex flex-col gap-1 px-5 py-4 text-sm transition hover:bg-[--color-primary]/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[--color-fg]">#{o.orderNumber}</p>
                  <p className="text-xs text-[--color-muted]">{new Date(o.createdAt).toLocaleString(locale)}</p>
                </div>
                <div className="text-end">
                  <p className="font-bold text-[--color-fg]">{price}</p>
                  <p className="text-xs text-[--color-muted]">
                    {dict.orders.statuses[o.status as keyof typeof dict.orders.statuses] ?? o.status}
                    {" · "}
                    {dict.orders.statuses[o.paymentStatus as keyof typeof dict.orders.statuses] ?? o.paymentStatus}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
