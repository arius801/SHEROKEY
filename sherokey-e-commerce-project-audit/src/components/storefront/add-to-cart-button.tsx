"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  variantId,
  quantity = 1,
  label,
  addedLabel,
  errorLabel,
  className,
  variant = "primary",
  redirectToCheckout = false,
  checkoutHref,
}: {
  variantId: number | null;
  quantity?: number;
  label: string;
  addedLabel: string;
  errorLabel: string;
  className?: string;
  variant?: "primary" | "outline";
  redirectToCheckout?: boolean;
  checkoutHref?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const { push } = useToast();
  const router = useRouter();

  function handleClick() {
    if (!variantId) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          push(data?.error || errorLabel, "error");
          return;
        }
        setAdded(true);
        push(addedLabel, "success");
        router.refresh();
        setTimeout(() => setAdded(false), 1800);
        if (redirectToCheckout) router.push(checkoutHref || "/checkout");
      } catch {
        push(errorLabel, "error");
      }
    });
  }

  const base =
    variant === "primary"
      ? "bg-[--color-primary] text-[--color-primary-fg] hover:opacity-90"
      : "border border-[--color-border] text-[--color-fg] hover:border-[--color-primary] hover:text-[--color-primary]";

  return (
    <button
      onClick={handleClick}
      disabled={pending || !variantId}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        base,
        className
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      {added ? addedLabel : label}
    </button>
  );
}
