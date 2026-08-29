import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getWishlistDetailed } from "@/lib/services/wishlist";
import { ProductCard } from "@/components/storefront/product-card";
import { Heart } from "lucide-react";
import { AccountShell } from "@/components/storefront/account-shell";

export const revalidate = 0;

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (!ctx.user) redirect(`/${locale}/login?redirect=/${locale}/account/wishlist`);
  const dict = ctx.dict;

  const items = await getWishlistDetailed(ctx.user.id, locale);
  const wishlistIds = new Set(items.map((i) => i.id));

  return (
    <AccountShell locale={locale} dict={dict} active="wishlist">
      <h1 className="mb-6 text-xl font-bold text-[--color-fg]">{dict.account.wishlist}</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[--color-border] py-16 text-center">
          <Heart className="mb-3 h-9 w-9 text-[--color-muted]" />
          <p className="font-semibold text-[--color-fg]">{dict.account.noWishlist}</p>
          <p className="text-sm text-[--color-muted]">{dict.account.noWishlistDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} currency={ctx.currency} locale={locale} dict={dict} isAuthenticated wishlisted={wishlistIds.has(p.id)} />
          ))}
        </div>
      )}
    </AccountShell>
  );
}
