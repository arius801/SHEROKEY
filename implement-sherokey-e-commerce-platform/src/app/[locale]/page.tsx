import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, BadgeCheck, Wallet, Languages, Headset, Sparkles } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";
import { listProducts } from "@/lib/services/products";
import { listCategories } from "@/lib/services/categories";
import { getWishlistProductIds } from "@/lib/services/wishlist";
import { ProductCard } from "@/components/storefront/product-card";
import { StarRating } from "@/components/ui/star-rating";
import { db } from "@/db";
import { reviews, productTranslations, users, faqs, faqTranslations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { CATEGORY_ICONS } from "@/components/storefront/category-icon";

export const revalidate = 0;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);
  const [categories, bestsellers, deals, aiProducts, software, wishlistIds] = await Promise.all([
    listCategories(locale),
    listProducts({ locale, bestseller: true, limit: 8 }),
    listProducts({ locale, onSale: true, limit: 8 }),
    listProducts({ locale, categorySlug: "ai-productivity", limit: 8 }),
    listProducts({ locale, categorySlug: "microsoft", limit: 8 }),
    getWishlistProductIds(ctx.user?.id ?? null),
  ]);

  const topReviews = await db
    .select({
      rating: reviews.rating,
      title: reviews.title,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      productName: productTranslations.name,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .innerJoin(productTranslations, and(eq(productTranslations.productId, reviews.productId), eq(productTranslations.locale, locale)))
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.rating), desc(reviews.createdAt))
    .limit(6);

  const faqRows = await db
    .select({ question: faqTranslations.question, answer: faqTranslations.answer })
    .from(faqs)
    .innerJoin(faqTranslations, and(eq(faqTranslations.faqId, faqs.id), eq(faqTranslations.locale, locale)))
    .where(eq(faqs.status, "active"))
    .limit(6);

  const dict = ctx.dict;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -end-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -start-40 top-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[--color-border] bg-[--color-card] px-3 py-1 text-xs font-semibold text-[--color-primary]">
              <Sparkles className="h-3.5 w-3.5" /> SHEROKEY
            </span>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-[--color-fg] sm:text-6xl">{dict.home.heroTitle}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[--color-muted] sm:text-lg">{dict.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/${locale}/products`} className="inline-flex items-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[--color-primary]/30 transition hover:opacity-90">
                {dict.home.exploreProducts} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link href={`/${locale}/deals`} className="inline-flex items-center gap-2 rounded-xl border border-[--color-border] bg-[--color-card] px-6 py-3 text-sm font-bold text-[--color-fg] transition hover:border-[--color-primary]">
                {dict.home.viewDeals}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[--color-fg]">{dict.home.featuredCategories}</h2>
          <Link href={`/${locale}/categories`} className="text-sm font-semibold text-[--color-primary] hover:underline">{dict.home.viewAll}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.slice(0, 8).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon ?? ""] ?? Sparkles;
            return (
              <Link
                key={cat.id}
                href={`/${locale}/category/${cat.slug}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-[--color-border] bg-[--color-card] p-4 text-center transition hover:-translate-y-1 hover:border-[--color-primary]/50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[--color-primary]/10 text-[--color-primary] transition group-hover:bg-[--color-primary] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-[--color-fg]">{cat.name}</span>
                <span className="text-[10px] text-[--color-muted]">{cat.productCount}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <ProductRail title={dict.home.bestSellers} viewAllHref={`/${locale}/products?sort=popular`} viewAllLabel={dict.home.viewAll} items={bestsellers.items} ctx={ctx} wishlistIds={wishlistIds} />
      <ProductRail title={dict.home.specialOffers} viewAllHref={`/${locale}/deals`} viewAllLabel={dict.home.viewAll} items={deals.items} ctx={ctx} wishlistIds={wishlistIds} tone="alt" />
      <ProductRail title={dict.home.aiProducts} viewAllHref={`/${locale}/category/ai-productivity`} viewAllLabel={dict.home.viewAll} items={aiProducts.items} ctx={ctx} wishlistIds={wishlistIds} />
      <ProductRail title={dict.home.softwareLicenses} viewAllHref={`/${locale}/category/microsoft`} viewAllLabel={dict.home.viewAll} items={software.items} ctx={ctx} wishlistIds={wishlistIds} tone="alt" />

      {/* Why SHEROKEY */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.home.whyTitle}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Zap, title: dict.home.whyInstant, desc: dict.home.whyInstantDesc },
            { icon: ShieldCheck, title: dict.home.whySecure, desc: dict.home.whySecureDesc },
            { icon: BadgeCheck, title: dict.home.whyVerified, desc: dict.home.whyVerifiedDesc },
            { icon: Wallet, title: dict.home.whyPrices, desc: dict.home.whyPricesDesc },
            { icon: Languages, title: dict.home.whyLanguages, desc: dict.home.whyLanguagesDesc },
            { icon: Headset, title: dict.home.whySupport, desc: dict.home.whySupportDesc },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[--color-primary]/10 text-[--color-primary]">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mb-1.5 text-base font-bold text-[--color-fg]">{item.title}</h3>
              <p className="text-sm text-[--color-muted]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      {topReviews.length > 0 && (
        <section className="bg-[--color-card]/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-10 text-center text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.home.reviewsTitle}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topReviews.map((r, i) => (
                <div key={i} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
                  <StarRating rating={r.rating} />
                  {r.title && <p className="mt-3 font-semibold text-[--color-fg]">{r.title}</p>}
                  <p className="mt-1 text-sm text-[--color-muted]">{r.comment}</p>
                  <p className="mt-4 text-xs font-medium text-[--color-fg]">
                    {r.firstName} {r.lastName?.charAt(0) ?? ""}. — <span className="text-[--color-muted]">{r.productName}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqRows.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.home.faqTitle}</h2>
          <div className="space-y-3">
            {faqRows.map((f, i) => (
              <details key={i} className="group rounded-xl border border-[--color-border] bg-[--color-card] p-4 open:border-[--color-primary]/40">
                <summary className="cursor-pointer list-none font-semibold text-[--color-fg] marker:content-none">{f.question}</summary>
                <p className="mt-2 text-sm text-[--color-muted]">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[--color-border] bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center text-white">
          <h2 className="text-2xl font-bold">{dict.home.newsletterTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/80">{dict.home.newsletterSubtitle}</p>
          <NewsletterForm placeholder={dict.home.newsletterPlaceholder} cta={dict.home.newsletterCta} success={dict.home.newsletterSuccess} />
        </div>
      </section>
    </div>
  );
}

function ProductRail({
  title,
  viewAllHref,
  viewAllLabel,
  items,
  ctx,
  wishlistIds,
  tone,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  items: Awaited<ReturnType<typeof listProducts>>["items"];
  ctx: Awaited<ReturnType<typeof getRequestContext>>;
  wishlistIds: Set<number>;
  tone?: "alt";
}) {
  if (items.length === 0) return null;
  return (
    <section className={tone === "alt" ? "bg-[--color-card]/30 py-14" : "py-2"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[--color-fg]">{title}</h2>
          <Link href={viewAllHref} className="text-sm font-semibold text-[--color-primary] hover:underline">{viewAllLabel}</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} currency={ctx.currency} locale={ctx.locale} dict={ctx.dict} isAuthenticated={!!ctx.user} wishlisted={wishlistIds.has(p.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
