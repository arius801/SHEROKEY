import Link from "next/link";
import { LayoutDashboard, Package, Heart, UserCog, ShieldCheck, LifeBuoy } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export function AccountShell({
  locale,
  dict,
  active,
  isAdmin,
  children,
}: {
  locale: string;
  dict: Dictionary;
  active: "overview" | "orders" | "wishlist" | "profile" | "support";
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const items = [
    { key: "overview", href: `/${locale}/account`, icon: LayoutDashboard, label: dict.account.overview },
    { key: "orders", href: `/${locale}/account/orders`, icon: Package, label: dict.account.orders },
    { key: "wishlist", href: `/${locale}/account/wishlist`, icon: Heart, label: dict.account.wishlist },
    { key: "support", href: `/${locale}/account/support`, icon: LifeBuoy, label: dict.support.myTickets },
    { key: "profile", href: `/${locale}/account/profile`, icon: UserCog, label: dict.account.profile },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="space-y-1 lg:col-span-1">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active === item.key ? "bg-[--color-primary]/10 text-[--color-primary]" : "text-[--color-muted] hover:bg-[--color-card]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-amber-400 hover:bg-[--color-card]">
              <ShieldCheck className="h-4 w-4" />
              {dict.nav.admin}
            </Link>
          )}
        </aside>
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  );
}
