"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SortSelect({ label, options, current }: { label: string; options: { value: string; label: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[--color-muted]">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[--color-border] bg-[--color-card] px-3 py-2 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
