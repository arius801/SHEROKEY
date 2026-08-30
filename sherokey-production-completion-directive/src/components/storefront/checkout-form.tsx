"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, Landmark, Wallet } from "lucide-react";

type PaymentMethod = "card" | "paypal" | "bank_transfer";

export function CheckoutForm({
  locale,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  initialCoupon,
  showBankTransfer,
  showPaypal,
  testMode,
  labels,
}: {
  locale: string;
  defaultEmail: string;
  defaultFirstName: string;
  defaultLastName: string;
  initialCoupon: string;
  showBankTransfer: boolean;
  showPaypal: boolean;
  testMode: boolean;
  labels: {
    email: string;
    firstName: string;
    lastName: string;
    coupon: string;
    paymentMethod: string;
    card: string;
    paypal: string;
    bankTransfer: string;
    agreeTerms: string;
    placeOrder: string;
    processing: string;
    genericError: string;
    testModeNotice: string;
  };
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [coupon, setCoupon] = useState(initialCoupon);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!terms) {
      setError(labels.agreeTerms);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          couponCode: coupon || undefined,
          paymentMethod,
          termsAccepted: terms,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        document.cookie = "shk_coupon=;path=/;max-age=0";
        if (data.redirectUrl) {
          // Hand off to the payment gateway's hosted checkout (Stripe Checkout /
          // PayPal approval page). The order stays "pending_payment" until the
          // gateway calls our webhook / return endpoint server-to-server.
          window.location.href = data.redirectUrl;
          return;
        }
        router.push(`/${locale}/order/${data.orderNumber}?email=${encodeURIComponent(email)}`);
      } else {
        setError(data?.message || labels.genericError);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.firstName}</label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.lastName}</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.coupon}</label>
        <input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[--color-muted]">{labels.paymentMethod}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${paymentMethod === "card" ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]" : "border-[--color-border] text-[--color-fg]"}`}
          >
            <CreditCard className="h-4 w-4" /> {labels.card}
          </button>
          {showPaypal && (
            <button
              type="button"
              onClick={() => setPaymentMethod("paypal")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${paymentMethod === "paypal" ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]" : "border-[--color-border] text-[--color-fg]"}`}
            >
              <Wallet className="h-4 w-4" /> {labels.paypal}
            </button>
          )}
          {showBankTransfer && (
            <button
              type="button"
              onClick={() => setPaymentMethod("bank_transfer")}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${paymentMethod === "bank_transfer" ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]" : "border-[--color-border] text-[--color-fg]"}`}
            >
              <Landmark className="h-4 w-4" /> {labels.bankTransfer}
            </button>
          )}
        </div>
        {testMode && paymentMethod !== "bank_transfer" && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">{labels.testModeNotice}</p>
        )}
      </div>

      <label className="flex items-start gap-2 text-xs text-[--color-muted]">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
        {labels.agreeTerms}
      </label>

      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? labels.processing : labels.placeOrder}
      </button>
    </form>
  );
}
