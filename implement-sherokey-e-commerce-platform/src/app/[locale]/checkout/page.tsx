import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { findCartId, getCartDetails } from "@/lib/services/cart";
import { validateCoupon } from "@/lib/services/coupons";
import { getStoreSettings } from "@/lib/services/settings";
import { priceLabels } from "@/lib/price-label";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const revalidate = 0;

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);
  const cartId = await findCartId(ctx.user);
  const { items, subtotalMinor } = await getCartDetails(cartId, locale);

  if (items.length === 0) redirect(`/${locale}/cart`);

  const settings = await getStoreSettings();
  const cookieStore = await cookies();
  const couponCode = cookieStore.get("shk_coupon")?.value ?? "";

  let discountMinor = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotalMinor, ctx.user?.id ?? null);
    if (result.valid) discountMinor = result.discountMinor;
  }
  const totalMinor = Math.max(subtotalMinor - discountMinor, 0);
  const dict = ctx.dict;

  const { price: subtotalLabel } = priceLabels(subtotalMinor, null, ctx.currency, locale);
  const { price: discountLabel } = priceLabels(discountMinor, null, ctx.currency, locale);
  const { price: totalLabel } = priceLabels(totalMinor, null, ctx.currency, locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.checkout.title}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6 lg:col-span-2">
          {!ctx.user && (
            <p className="mb-5 rounded-lg bg-[--color-primary]/10 px-3 py-2 text-xs text-[--color-primary]">
              {dict.checkout.guestCheckout} — {dict.checkout.haveAccount}{" "}
              <Link href={`/${locale}/login?redirect=/${locale}/checkout`} className="font-semibold underline">
                {dict.checkout.signInToSpeedUp}
              </Link>
            </p>
          )}
          <CheckoutForm
            locale={locale}
            defaultEmail={ctx.user?.email ?? ""}
            defaultFirstName={ctx.user?.firstName ?? ""}
            defaultLastName={ctx.user?.lastName ?? ""}
            initialCoupon={couponCode}
            showBankTransfer={settings.paymentProviders.bank_transfer}
            labels={{
              email: dict.checkout.email,
              firstName: dict.checkout.firstName,
              lastName: dict.checkout.lastName,
              coupon: dict.checkout.coupon,
              paymentMethod: dict.checkout.paymentMethod,
              card: "Credit / Debit Card",
              bankTransfer: "Bank Transfer",
              agreeTerms: dict.checkout.agreeTerms,
              placeOrder: dict.checkout.placeOrder,
              processing: dict.checkout.processing,
              genericError: dict.errors.genericError,
            }}
          />
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
          <h2 className="text-sm font-bold text-[--color-fg]">{dict.checkout.orderSummary}</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-[--color-muted]">
                <span className="line-clamp-1">
                  {item.name} × {item.quantity}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-[--color-border] pt-3 text-sm">
            <div className="flex justify-between text-[--color-muted]">
              <span>{dict.cart.subtotal}</span>
              <span>{subtotalLabel}</span>
            </div>
            {discountMinor > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>{dict.cart.discount}</span>
                <span>-{discountLabel}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[--color-border] pt-2 text-base font-bold text-[--color-fg]">
              <span>{dict.cart.total}</span>
              <span>{totalLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
