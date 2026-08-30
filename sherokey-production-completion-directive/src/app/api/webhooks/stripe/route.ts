import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { constructStripeEvent } from "@/lib/services/payments/stripe";
import { confirmOrderPayment, markOrderPaymentFailed, sendPaymentConfirmationEmail } from "@/lib/services/orders";

// Stripe requires the raw request body to verify the signature, so this route
// must not run through any body-parsing middleware.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = Number(session.metadata?.orderId);
        if (orderId && session.payment_status === "paid") {
          const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
          const result = await confirmOrderPayment({
            orderId,
            provider: "stripe",
            transactionId: paymentIntentId || session.id,
            amountMinor: session.amount_total ?? 0,
            currency: (session.currency ?? "usd").toUpperCase(),
            metadata: { sessionId: session.id, paymentIntentId },
          });
          if (!("alreadyProcessed" in result) || !result.alreadyProcessed) {
            await sendPaymentConfirmationEmail(orderId).catch(() => null);
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = Number(session.metadata?.orderId);
        if (orderId) await markOrderPaymentFailed(orderId, "stripe_session_expired");
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = Number(intent.metadata?.orderId);
        if (orderId) await markOrderPaymentFailed(orderId, "stripe_payment_failed");
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler error", err);
    // Return 500 so Stripe retries delivery.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
