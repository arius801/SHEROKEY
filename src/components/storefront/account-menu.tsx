"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { User, LogOut, LayoutDashboard, Package, Heart, ShieldCheck } from "lucide-react";

export function AccountMenu({
  locale,
  name,
  isAdmin,
  labels,
}: {
  locale: string;
  name: string;
  isAdmin: boolean;
  labels: { account: string; orders: string; wishlist: string; admin: string; logout: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[--color-border] px-2.5 text-sm text-[--color-fg] transition hover:border-[--color-primary]"
      >
        <User className="h-4 w-4" />
        <span className="hidden max-w-[110px] truncate sm:inline">{name}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[--color-border] bg-[--color-card] py-1 shadow-2xl animate-fade-in">
          <Link href={`/${locale}/account`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[--color-primary]/10">
            <LayoutDashboard className="h-4 w-4" /> {labels.account}
          </Link>
          <Link href={`/${locale}/account/orders`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[--color-primary]/10">
            <Package className="h-4 w-4" /> {labels.orders}
          </Link>
          <Link href={`/${locale}/account/wishlist`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[--color-primary]/10">
            <Heart className="h-4 w-4" /> {labels.wishlist}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[--color-primary] hover:bg-[--color-primary]/10">
              <ShieldCheck className="h-4 w-4" /> {labels.admin}
            </Link>
          )}
          <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-rose-400 hover:bg-rose-500/10">
            <LogOut className="h-4 w-4" /> {labels.logout}
          </button>
        </div>
      )}
    </div>
  );
}
