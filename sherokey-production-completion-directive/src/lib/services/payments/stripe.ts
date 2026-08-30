import "server-only";
import Stripe from "stripe";

let client: Stripe | null | undefined;

/**
 * Lazily instantiate the Stripe SDK client. Returns `null` when no secret key is
 * configured so that callers can gracefully fall back (e.g. to bank transfer or
 * the sandbox test-mode payment used for local development without credentials).
 *
 * Required environment variables:
 *  - STRIPE_SECRET_KEY               server-side secret key (sk_live_/sk_test_)
 *  - STRIPE_WEBHOOK_SECRET           signing secret for the /api/webhooks/stripe endpoint
 *  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (optional) exposed to the browser if using Stripe.js elements
 */
export function getStripeClient(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    client = null;
    return client;
  }
  client = new Stripe(key, { apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion });
  return client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Creates a hosted Stripe Checkout Session for a SHEROKEY order. The browser is
 * redirected to `session.url`; Stripe collects card details on Stripe-hosted
 * infrastructure so raw card data never touches our server. The order is only
 * marked as paid once Stripe calls our webhook (`checkout.session.completed`),
 * never based on the browser's redirect back to the success URL.
 */
export async function createStripeCheckoutSession(params: {
  orderId: number;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    client_reference_id: params.orderNumber,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountMinor,
          product_data: { name: `SHEROKEY Order #${params.orderNumber}` },
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: String(params.orderId), orderNumber: params.orderNumber },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { id: session.id, url: session.url };
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw new Error("Stripe webhook is not configured");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function refundStripePayment(paymentIntentId: string, amountMinor?: number) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountMinor,
  });
}

export async function retrieveStripeSession(sessionId: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
}
