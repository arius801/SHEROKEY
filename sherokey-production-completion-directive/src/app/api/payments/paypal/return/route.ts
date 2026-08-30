import { NextRequest, NextResponse } from "next/server";
import { capturePaypalOrder } from "@/lib/services/payments/paypal";
import { confirmOrderPayment, markOrderPaymentFailed, sendPaymentConfirmationEmail, getOrderAdmin } from "@/lib/services/orders";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * PayPal redirects the customer's browser here after they approve payment on
 * PayPal's site. The browser only carries the PayPal order token — it never
 * asserts payment success itself. We capture the order server-to-server against
 * PayPal's API (the authoritative source of truth) before marking the order paid.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const localeParam = req.nextUrl.searchParams.get("locale");
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  if (!token) {
    return NextResponse.redirect(`${siteUrl()}/${locale}/checkout?payment=cancelled`);
  }

  try {
    const capture = await capturePaypalOrder(token);
    if (capture.status !== "COMPLETED" || !capture.orderId) {
      if (capture.orderId) await markOrderPaymentFailed(capture.orderId, "paypal_capture_not_completed");
      return NextResponse.redirect(`${siteUrl()}/${locale}/checkout?payment=failed`);
    }

    const result = await confirmOrderPayment({
      orderId: capture.orderId,
      provider: "paypal",
      transactionId: capture.captureId || token,
      amountMinor: capture.amountMinor,
      currency: capture.currency,
      metadata: { paypalOrderId: token, captureId: capture.captureId },
    });

    if (!("alreadyProcessed" in result) || !result.alreadyProcessed) {
      await sendPaymentConfirmationEmail(capture.orderId).catch(() => null);
    }

    const order = await getOrderAdmin(capture.orderId);
    const orderNumber = order?.order.orderNumber;
    return NextResponse.redirect(`${siteUrl()}/${locale}/order/${orderNumber}?email=${encodeURIComponent(email)}&payment=success`);
  } catch (err) {
    console.error("PayPal capture failed", err);
    return NextResponse.redirect(`${siteUrl()}/${locale}/checkout?payment=failed`);
  }
}
