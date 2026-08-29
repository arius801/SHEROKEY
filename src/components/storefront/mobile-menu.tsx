"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border]">
        <Menu className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 bg-[--color-card] p-5 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border]">
              <X className="h-4 w-4" />
            </button>
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[--color-fg] hover:bg-[--color-primary]/10">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
