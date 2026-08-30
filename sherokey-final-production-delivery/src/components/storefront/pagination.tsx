import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, basePath, searchParams }: { page: number; totalPages: number; basePath: string; searchParams: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] ${page === 1 ? "pointer-events-none opacity-40" : "hover:border-[--color-primary]"}`}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </Link>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-[--color-muted]">…</span>}
          <Link
            href={hrefFor(p)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium ${
              p === page ? "border-[--color-primary] bg-[--color-primary] text-white" : "border-[--color-border] text-[--color-fg] hover:border-[--color-primary]"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] ${page === totalPages ? "pointer-events-none opacity-40" : "hover:border-[--color-primary]"}`}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </nav>
  );
}
