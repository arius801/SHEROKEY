import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Package, Heart, UserCog } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listOrdersForUser } from "@/lib/services/orders";
import { AccountShell } from "@/components/storefront/account-shell";
import { priceLabels } from "@/lib/price-label";

export const revalidate = 0;

export default async function AccountOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (!ctx.user) redirect(`/${locale}/login?redirect=/${locale}/account`);
  const dict = ctx.dict;

  const orders = await listOrdersForUser(ctx.user.id);
  const recent = orders.slice(0, 5);

  return (
    <AccountShell locale={locale} dict={dict} active="overview" isAdmin={ctx.user.role === "admin" || ctx.user.role === "manager"}>
      <h1 className="mb-6 text-xl font-bold text-[--color-fg]">
        {dict.account.overview} — {ctx.user.firstName}
      </h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
          <Package className="mb-2 h-5 w-5 text-[--color-primary]" />
          <p className="text-2xl font-bold text-[--color-fg]">{orders.length}</p>
          <p className="text-xs text-[--color-muted]">{dict.account.totalOrders}</p>
        </div>
        <Link href={`/${locale}/account/wishlist`} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5 transition hover:border-[--color-primary]/50">
          <Heart className="mb-2 h-5 w-5 text-rose-400" />
          <p className="text-sm font-semibold text-[--color-fg]">{dict.account.wishlist}</p>
        </Link>
        <Link href={`/${locale}/account/profile`} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5 transition hover:border-[--color-primary]/50">
          <UserCog className="mb-2 h-5 w-5 text-sky-400" />
          <p className="text-sm font-semibold text-[--color-fg]">{dict.account.profile}</p>
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-bold text-[--color-fg]">{dict.account.recentOrders}</h2>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[--color-border] py-10 text-center">
          <p className="font-semibold text-[--color-fg]">{dict.account.noOrders}</p>
          <p className="text-sm text-[--color-muted]">{dict.account.noOrdersDesc}</p>
        </div>
      ) : (
        <div className="divide-y divide-[--color-border] rounded-2xl border border-[--color-border] bg-[--color-card]">
          {recent.map((o) => {
            const { price } = priceLabels(o.totalMinor, null, { code: o.currency, name: o.currency, symbol: "", exchangeRate: 1, decimals: 2, symbolPosition: "before", enabled: true, isDefault: false }, locale);
            return (
              <Link key={o.id} href={`/${locale}/order/${o.orderNumber}?email=${encodeURIComponent(ctx.user!.email)}`} className="flex items-center justify-between px-5 py-4 text-sm hover:bg-[--color-primary]/5">
                <div>
                  <p className="font-semibold text-[--color-fg]">#{o.orderNumber}</p>
                  <p className="text-xs text-[--color-muted]">{new Date(o.createdAt).toLocaleDateString(locale)}</p>
                </div>
                <div className="text-end">
                  <p className="font-bold text-[--color-fg]">{price}</p>
                  <p className="text-xs text-[--color-muted]">{dict.orders.statuses[o.status as keyof typeof dict.orders.statuses] ?? o.status}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
