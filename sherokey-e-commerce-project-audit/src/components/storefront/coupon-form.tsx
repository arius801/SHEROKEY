"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2 } from "lucide-react";

export function CouponForm({
  labels,
  initialCode,
}: {
  labels: { placeholder: string; apply: string; applied: string; invalid: string };
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode || "");
  const [status, setStatus] = useState<"idle" | "applied" | "invalid">("idle");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        setStatus("applied");
        document.cookie = `shk_coupon=${encodeURIComponent(code.trim().toUpperCase())};path=/;max-age=${60 * 60 * 24}`;
        router.refresh();
      } else {
        setStatus("invalid");
        document.cookie = "shk_coupon=;path=/;max-age=0";
      }
    });
  }

  return (
    <form onSubmit={apply} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Tag className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted]" />
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setStatus("idle");
          }}
          placeholder={labels.placeholder}
          className="w-full rounded-lg border border-[--color-border] bg-[--color-bg] py-2 ps-9 pe-3 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-[--color-border] px-4 py-2 text-sm font-semibold text-[--color-fg] hover:border-[--color-primary] disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {labels.apply}
      </button>
      {status === "applied" && <span className="text-xs font-semibold text-emerald-400">{labels.applied}</span>}
      {status === "invalid" && <span className="text-xs font-semibold text-rose-400">{labels.invalid}</span>}
    </form>
  );
}
