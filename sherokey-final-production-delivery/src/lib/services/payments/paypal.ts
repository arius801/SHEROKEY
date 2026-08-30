import "server-only";

/**
 * Minimal PayPal Orders v2 REST integration (no SDK dependency).
 *
 * Required environment variables:
 *  - PAYPAL_CLIENT_ID
 *  - PAYPAL_CLIENT_SECRET
 *  - PAYPAL_MODE               "sandbox" (default) or "live"
 */
export function isPaypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl(): string {
  return process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal is not configured");

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Creates a PayPal order and returns the id + the "approve" redirect link. */
export async function createPaypalOrder(params: {
  orderId: number;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string }> {
  const token = await getAccessToken();
  const value = (params.amountMinor / 100).toFixed(2);

  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderNumber,
          custom_id: String(params.orderId),
          description: `SHEROKEY Order #${params.orderNumber}`,
          amount: { currency_code: params.currency.toUpperCase(), value },
        },
      ],
      application_context: {
        brand_name: "SHEROKEY",
        user_action: "PAY_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal order creation failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string; links: { rel: string; href: string }[] };
  const approve = data.links.find((l) => l.rel === "approve");
  if (!approve) throw new Error("PayPal did not return an approval link");
  return { id: data.id, approveUrl: approve.href };
}

export type PaypalCaptureResult = {
  status: string;
  captureId: string | null;
  amountMinor: number;
  currency: string;
  orderId: number | null;
};

/** Captures an approved PayPal order. This is the authoritative, server-verified payment confirmation. */
export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalCaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${res.status} ${JSON.stringify(data)}`);
  }
  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id ?? null,
    amountMinor: capture ? Math.round(Number(capture.amount.value) * 100) : 0,
    currency: capture?.amount?.currency_code ?? "USD",
    orderId: unit?.custom_id ? Number(unit.custom_id) : null,
  };
}

export async function refundPaypalCapture(captureId: string, amountMinor?: number, currency?: string) {
  const token = await getAccessToken();
  const body = amountMinor && currency ? { amount: { value: (amountMinor / 100).toFixed(2), currency_code: currency } } : undefined;
  const res = await fetch(`${baseUrl()}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal refund failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}
