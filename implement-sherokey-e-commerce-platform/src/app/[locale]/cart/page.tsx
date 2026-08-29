import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { findCartId, getCartDetails } from "@/lib/services/cart";
import { validateCoupon } from "@/lib/services/coupons";
import { CartItemRow } from "@/components/storefront/cart-item-row";
import { CouponForm } from "@/components/storefront/coupon-form";
import { priceLabels } from "@/lib/price-label";

export const revalidate = 0;

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);
  const cartId = await findCartId(ctx.user);
  const { items, subtotalMinor } = await getCartDetails(cartId, locale);
  const dict = ctx.dict;

  const cookieStore = await cookies();
  const couponCode = cookieStore.get("shk_coupon")?.value;
  let discountMinor = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotalMinor, ctx.user?.id ?? null);
    if (result.valid) discountMinor = result.discountMinor;
  }

  const totalMinor = Math.max(subtotalMinor - discountMinor, 0);
  const { price: subtotalLabel } = priceLabels(subtotalMinor, null, ctx.currency, locale);
  const { price: discountLabel } = priceLabels(discountMinor, null, ctx.currency, locale);
  const { price: totalLabel } = priceLabels(totalMinor, null, ctx.currency, locale);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <ShoppingBag className="mb-4 h-12 w-12 text-[--color-muted]" />
        <h1 className="text-xl font-bold text-[--color-fg]">{dict.cart.empty}</h1>
        <p className="mt-1 text-sm text-[--color-muted]">{dict.cart.emptyDesc}</p>
        <Link href={`/${locale}/products`} className="mt-6 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white hover:opacity-90">
          {dict.cart.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.cart.title}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5 lg:col-span-2">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} currency={ctx.currency} locale={locale} removeLabel={dict.cart.remove} />
          ))}
        </div>

        <div className="h-fit space-y-5 rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
          <CouponForm
            labels={{ placeholder: dict.cart.couponPlaceholder, apply: dict.cart.applyCoupon, applied: dict.cart.couponApplied, invalid: dict.cart.couponInvalid }}
            initialCode={couponCode}
          />

          <div className="space-y-2 border-t border-[--color-border] pt-4 text-sm">
            <div className="flex justify-between text-[--color-muted]">
              <span>{dict.cart.subtotal}</span>
              <span className="font-semibold text-[--color-fg]">{subtotalLabel}</span>
            </div>
            {discountMinor > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>{dict.cart.couponDiscount}</span>
                <span className="font-semibold">-{discountLabel}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[--color-border] pt-2 text-base font-bold text-[--color-fg]">
              <span>{dict.cart.total}</span>
              <span>{totalLabel}</span>
            </div>
          </div>

          <Link
            href={`/${locale}/checkout`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            {dict.cart.proceedToCheckout} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <Link href={`/${locale}/products`} className="block text-center text-xs font-semibold text-[--color-muted] hover:text-[--color-primary]">
            {dict.cart.continueShopping}
          </Link>
        </div>
      </div>
    </div>
  );
}
