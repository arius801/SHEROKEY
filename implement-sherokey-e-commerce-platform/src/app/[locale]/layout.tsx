import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getCartDetails } from "@/lib/services/cart";
import { findCartId } from "@/lib/services/cart";
import { db } from "@/db";
import { wishlistItems, announcements } from "@/db/schema";
import { and, eq, or, isNull, lte, gte, sql } from "drizzle-orm";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { MobileBottomNav } from "@/components/storefront/mobile-bottom-nav";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { ToastProvider } from "@/components/providers/toast-provider";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }, { locale: "ru" }];
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);

  const cartId = await findCartId(ctx.user);
  const { items } = await getCartDetails(cartId, locale);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  let wishlistCount = 0;
  if (ctx.user) {
    const rows = await db.select({ count: sql<number>`count(*)::int` }).from(wishlistItems).where(eq(wishlistItems.userId, ctx.user.id));
    wishlistCount = rows[0]?.count ?? 0;
  }

  const now = new Date();
  const activeAnnouncements = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "active"),
        eq(announcements.locale, locale),
        or(isNull(announcements.startAt), lte(announcements.startAt, now)),
        or(isNull(announcements.endAt), gte(announcements.endAt, now))
      )
    )
    .limit(1);

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col pb-14 sm:pb-0">
        {activeAnnouncements[0] && <AnnouncementBar text={activeAnnouncements[0].text} link={activeAnnouncements[0].link} />}
        <Header ctx={ctx} cartCount={cartCount} wishlistCount={wishlistCount} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={ctx.dict} />
        <MobileBottomNav locale={locale} dict={ctx.dict} />
      </div>
    </ToastProvider>
  );
}
