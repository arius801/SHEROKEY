import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findCartId } from "@/lib/services/cart";
import { createOrderFromCart, confirmOrderPayment, sendPaymentConfirmationEmail, OrderError } from "@/lib/services/orders";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { randomToken } from "@/lib/crypto";
import { logAudit } from "@/lib/services/audit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  couponCode: z.string().trim().max(64).optional(),
  currency: z.string().trim().length(3).optional(),
  paymentMethod: z.enum(["card", "bank_transfer"]).default("card"),
  termsAccepted: z.boolean(),
  locale: z.string().optional(),
});

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

    // Sandbox card payment: simulate an instant successful charge (no real payment gateway keys configured).
    const transactionId = `sandbox_${randomToken(12)}`;
    const result = await confirmOrderPayment({
      orderId: order.id,
      provider: "card_sandbox",
      transactionId,
      amountMinor: order.totalMinor,
      currency: order.currency,
      metadata: { simulated: true },
    });

    await sendPaymentConfirmationEmail(order.id).catch(() => null);

    return NextResponse.json({ orderNumber: order.orderNumber, status: "paid", paymentMethod: "card", alreadyProcessed: "alreadyProcessed" in result ? result.alreadyProcessed : false }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
