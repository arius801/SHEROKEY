"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar({ locale, placeholder, className }: { locale: string; placeholder: string; className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/${locale}/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted]" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="search"
          placeholder={placeholder}
          className="w-full rounded-xl border border-[--color-border] bg-[--color-bg]/60 py-2.5 ps-9 pe-3 text-sm text-[--color-fg] outline-none transition placeholder:text-[--color-muted] focus:border-[--color-primary]"
        />
      </div>
    </form>
  );
}
