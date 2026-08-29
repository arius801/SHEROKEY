"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Check, Coins } from "lucide-react";
import type { CurrencyConfig } from "@/lib/money";

export function CurrencySwitcher({ currency, currencies }: { currency: CurrencyConfig; currencies: CurrencyConfig[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchTo(code: string) {
    document.cookie = `shk_currency=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[--color-border] px-2.5 text-sm text-[--color-fg] transition hover:border-[--color-primary]"
      >
        <Coins className="h-4 w-4" />
        <span>{currency.code}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[--color-border] bg-[--color-card] py-1 shadow-2xl animate-fade-in">
          {currencies.map((c) => (
            <button
              key={c.code}
              onClick={() => switchTo(c.code)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-[--color-fg] hover:bg-[--color-primary]/10"
            >
              <span>
                {c.code} <span className="text-[--color-muted]">({c.symbol})</span>
              </span>
              {c.code === currency.code && <Check className="h-3.5 w-3.5 text-[--color-primary]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
