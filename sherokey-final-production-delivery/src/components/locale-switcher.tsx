"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/locales";
import { setCookie } from "@/lib/utils";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
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

  function switchTo(next: Locale) {
    setCookie("shk_locale", next, 60 * 60 * 24 * 365);
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[--color-border] px-2.5 text-sm text-[--color-fg] transition hover:border-[--color-primary]"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_META[locale].nativeLabel}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-[--color-border] bg-[--color-card] py-1 shadow-2xl animate-fade-in">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-[--color-fg] hover:bg-[--color-primary]/10"
            >
              {LOCALE_META[l].nativeLabel}
              {l === locale && <Check className="h-3.5 w-3.5 text-[--color-primary]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
