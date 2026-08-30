import Link from "next/link";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/storefront/search-bar";
import { AccountMenu } from "@/components/storefront/account-menu";
import { MobileMenu } from "@/components/storefront/mobile-menu";
import type { RequestContext } from "@/lib/request-context";

export function Header({ ctx, cartCount, wishlistCount }: { ctx: RequestContext; cartCount: number; wishlistCount: number }) {
  const { locale, dict, user, currency, currencies, theme } = ctx;

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/products`, label: dict.nav.products },
    { href: `/${locale}/categories`, label: dict.nav.categories },
    { href: `/${locale}/deals`, label: dict.nav.deals },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-border] bg-[--color-bg]/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <MobileMenu links={links} />

        <Link href={`/${locale}`} className="flex items-center gap-2 font-black tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg text-[--color-fg]">SHEROKEY</span>
        </Link>

        <nav className="ms-4 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-[--color-muted] transition hover:bg-[--color-primary]/10 hover:text-[--color-fg]">
              {l.label}
            </Link>
          ))}
        </nav>

        <SearchBar locale={locale} placeholder={dict.nav.search} className="mx-2 hidden max-w-sm flex-1 md:block" />

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} />
          </div>
          <div className="hidden sm:block">
            <CurrencySwitcher currency={currency} currencies={currencies} />
          </div>
          <ThemeToggle theme={theme} />

          <Link href={`/${locale}/account/wishlist`} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] hover:border-[--color-primary]">
            <Heart className="h-4 w-4" />
            {wishlistCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-primary] px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link href={`/${locale}/cart`} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] hover:border-[--color-primary]">
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-primary] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <AccountMenu
              locale={locale}
              name={user.firstName || user.email}
              isAdmin={user.role === "admin" || user.role === "manager"}
              labels={{ account: dict.nav.myAccount, orders: dict.nav.myOrders, wishlist: dict.nav.wishlist, admin: dict.nav.admin, logout: dict.nav.logout }}
            />
          ) : (
            <Link href={`/${locale}/login`} className="rounded-lg bg-[--color-primary] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              {dict.nav.login}
            </Link>
          )}
        </div>
      </div>
      <div className="border-t border-[--color-border] px-4 py-2 md:hidden">
        <SearchBar locale={locale} placeholder={dict.nav.search} />
      </div>
    </header>
  );
}
