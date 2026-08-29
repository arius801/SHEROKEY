import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getOrderDetail } from "@/lib/services/orders";
import { OrderView } from "@/components/storefront/order-view";

export const revalidate = 0;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;

  const ctx = await getRequestContext(locale);
  const detail = await getOrderDetail(orderNumber.toUpperCase(), { userId: ctx.user?.id ?? null, email: sp.email });
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg] sm:text-3xl">
        {dict.checkout.orderNumber} #{orderNumber.toUpperCase()}
      </h1>
      <OrderView
        initialOrder={detail ? { order: detail.order, items: detail.items } : null}
        orderNumber={orderNumber.toUpperCase()}
        locale={locale}
        labels={{
          orderNumber: dict.checkout.orderNumber,
          paymentStatus: dict.checkout.paymentStatus,
          deliveryStatus: dict.checkout.deliveryStatus,
          yourDigitalProducts: dict.checkout.yourDigitalProducts,
          reveal: dict.delivery.reveal,
          copy: dict.delivery.copy,
          copied: dict.delivery.copied,
          activationInstructions: dict.delivery.activationInstructions,
          pendingManualFulfillment: dict.delivery.pendingManualFulfillment,
          lookupTitle: dict.checkout.orderNumber,
          lookupEmail: dict.checkout.email,
          lookupSubmit: dict.checkout.viewOrder,
          lookupNotFound: dict.errors.notFoundTitle,
          subtotal: dict.cart.subtotal,
          discount: dict.cart.discount,
          total: dict.cart.total,
          statuses: dict.orders.statuses,
        }}
      />
    </div>
  );
}
