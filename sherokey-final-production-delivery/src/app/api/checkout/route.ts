import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findCartId } from "@/lib/services/cart";
import { createOrderFromCart, confirmOrderPayment, sendPaymentConfirmationEmail, OrderError } from "@/lib/services/orders";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { randomToken } from "@/lib/crypto";
import { logAudit } from "@/lib/services/audit";
import { getStoreSettings } from "@/lib/services/settings";
import { createStripeCheckoutSession } from "@/lib/services/payments/stripe";
import { createPaypalOrder } from "@/lib/services/payments/paypal";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  couponCode: z.string().trim().max(64).optional(),
  currency: z.string().trim().length(3).optional(),
  paymentMethod: z.enum(["card", "paypal", "bank_transfer"]).default("card"),
  termsAccepted: z.boolean(),
  locale: z.string().optional(),
});

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`checkout:${ip}`, 20, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const user = await getCurrentUser();
  const cartId = await findCartId(user);
  if (!cartId) return NextResponse.json({ error: "EMPTY_CART" }, { status: 400 });

  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : DEFAULT_LOCALE;

  try {
    // The server always recalculates pricing, discounts and totals from the
    // database inside createOrderFromCart — the browser only ever supplies a
    // coupon code and identity fields, never a price or total.
    const order = await createOrderFromCart({
      cartId,
      user,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || "",
      locale,
      currencyCode: parsed.data.currency || user?.currency || "USD",
      couponCode: parsed.data.couponCode,
      ip,
      termsAccepted: parsed.data.termsAccepted,
    });

    if (parsed.data.paymentMethod === "bank_transfer") {
      await logAudit({ userId: user?.id ?? null, action: "order.bank_transfer_selected", entityType: "order", entityId: order.id, ip });
      return NextResponse.json({ orderNumber: order.orderNumber, status: "pending_payment", paymentMethod: "bank_transfer" }, { status: 201 });
    }

    const settings = await getStoreSettings();

    if (parsed.data.paymentMethod === "card" && settings.paymentProviders.stripe) {
      const session = await createStripeCheckoutSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountMinor: order.totalMinor,
        currency: order.currency,
        customerEmail: parsed.data.email,
        successUrl: `${siteUrl()}/${locale}/order/${order.orderNumber}?email=${encodeURIComponent(parsed.data.email)}&payment=success`,
        cancelUrl: `${siteUrl()}/${locale}/checkout?payment=cancelled`,
      });
      await logAudit({ userId: user?.id ?? null, action: "order.stripe_session_created", entityType: "order", entityId: order.id, ip });
      return NextResponse.json({ orderNumber: order.orderNumber, status: "pending_payment", paymentMethod: "card", redirectUrl: session.url }, { status: 201 });
    }

    if (parsed.data.paymentMethod === "paypal" && settings.paymentProviders.paypal) {
      const paypalOrder = await createPaypalOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountMinor: order.totalMinor,
        currency: order.currency,
        returnUrl: `${siteUrl()}/api/payments/paypal/return?locale=${locale}&email=${encodeURIComponent(parsed.data.email)}`,
        cancelUrl: `${siteUrl()}/${locale}/checkout?payment=cancelled`,
      });
      await logAudit({ userId: user?.id ?? null, action: "order.paypal_order_created", entityType: "order", entityId: order.id, ip, metadata: { paypalOrderId: paypalOrder.id } });
      return NextResponse.json({ orderNumber: order.orderNumber, status: "pending_payment", paymentMethod: "paypal", redirectUrl: paypalOrder.approveUrl }, { status: 201 });
    }

    // No real payment gateway is configured in this environment (STRIPE_SECRET_KEY /
    // PAYPAL_CLIENT_ID+SECRET are unset). We fall back to a clearly-labeled sandbox
    // test-mode confirmation so the full order → fulfillment pipeline stays testable
    // end-to-end. This path is automatically disabled the moment real credentials are
    // configured (see getStoreSettings — paymentProviders.sandbox).
    if (!settings.paymentProviders.sandbox) {
      return NextResponse.json({ error: "PAYMENT_METHOD_UNAVAILABLE" }, { status: 400 });
    }

    const transactionId = `sandbox_${randomToken(12)}`;
    const result = await confirmOrderPayment({
      orderId: order.id,
      provider: "card_sandbox",
      transactionId,
      amountMinor: order.totalMinor,
      currency: order.currency,
      metadata: { simulated: true, reason: "No live payment gateway configured (test mode)" },
    });

    await sendPaymentConfirmationEmail(order.id).catch(() => null);

    return NextResponse.json({ orderNumber: order.orderNumber, status: "paid", paymentMethod: "card", testMode: true, alreadyProcessed: "alreadyProcessed" in result ? result.alreadyProcessed : false }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
