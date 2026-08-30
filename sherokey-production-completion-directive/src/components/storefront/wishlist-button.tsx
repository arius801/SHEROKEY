"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialActive,
  isAuthenticated,
  loginHref,
  className,
  size = "md",
}: {
  productId: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function toggle() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    startTransition(async () => {
      const method = active ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        setActive(!active);
        push(active ? "Removed from wishlist" : "Added to wishlist", "success");
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      aria-label="Toggle wishlist"
      className={cn(
        "flex items-center justify-center rounded-full border border-[--color-border] bg-[--color-card]/80 backdrop-blur transition hover:border-rose-400",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className
      )}
    >
      <Heart className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", active ? "fill-rose-500 text-rose-500" : "text-[--color-muted]")} />
    </button>
  );
}
