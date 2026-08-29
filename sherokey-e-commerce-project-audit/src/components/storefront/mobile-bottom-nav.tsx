import Link from "next/link";
import { Home, LayoutGrid, ShoppingBag, User, Heart } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export function MobileBottomNav({ locale, dict }: { locale: string; dict: Dictionary }) {
  const items = [
    { href: `/${locale}`, icon: Home, label: dict.nav.home },
    { href: `/${locale}/categories`, icon: LayoutGrid, label: dict.nav.categories },
    { href: `/${locale}/cart`, icon: ShoppingBag, label: dict.nav.cart },
    { href: `/${locale}/account/wishlist`, icon: Heart, label: dict.nav.wishlist },
    { href: `/${locale}/account`, icon: User, label: dict.nav.account },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[--color-border] bg-[--color-bg]/95 backdrop-blur-lg sm:hidden">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-2.5 text-[--color-muted]">
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
