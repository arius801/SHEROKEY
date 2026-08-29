import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Zap, ChevronRight } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getProductDetail, getRelatedProducts } from "@/lib/services/products";
import { getWishlistProductIds } from "@/lib/services/wishlist";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { VariantSelector } from "@/components/storefront/variant-selector";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/storefront/product-card";
import { ReviewForm } from "@/components/storefront/review-form";
import { db } from "@/db";
import { reviews, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const revalidate = 0;

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);
  const detail = await getProductDetail(slug, locale);
  if (!detail) notFound();

  const { product, translation, variants, categoryName, categorySlug, price } = detail;
  const dict = ctx.dict;

  const [wishlistIds, related, reviewRows] = await Promise.all([
    getWishlistProductIds(ctx.user?.id ?? null),
    getRelatedProducts(product.categoryId, product.id, locale, 4),
    db
      .select({ id: reviews.id, rating: reviews.rating, title: reviews.title, comment: reviews.comment, createdAt: reviews.createdAt, verifiedPurchase: reviews.verifiedPurchase, firstName: users.firstName, lastName: users.lastName })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.productId, product.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
  ]);

  const features = translation?.features ?? [];
  const whatsIncluded = translation?.whatsIncluded ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-[--color-muted]">
        <Link href={`/${locale}`} className="hover:text-[--color-primary]">
          {dict.nav.home}
        </Link>
        <ChevronRight className="h-3 w-3 rtl:rotate-180" />
        <Link href={`/${locale}/category/${categorySlug}`} className="hover:text-[--color-primary]">
          {categoryName}
        </Link>
        <ChevronRight className="h-3 w-3 rtl:rotate-180" />
        <span className="text-[--color-fg]">{translation?.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[--color-border] bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={translation?.name ?? product.slug} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl font-black text-[--color-primary]/30">{(translation?.name ?? product.slug).slice(0, 2).toUpperCase()}</div>
          )}
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {product.bestseller && <Badge tone="bestseller">{dict.badges.bestseller}</Badge>}
            {product.isNew && <Badge tone="new">{dict.badges.new}</Badge>}
            {price.onSale && <Badge tone="sale">-{price.discountPercent}%</Badge>}
          </div>
          <div className="absolute end-3 top-3">
            <WishlistButton productId={product.id} initialActive={wishlistIds.has(product.id)} isAuthenticated={!!ctx.user} loginHref={`/${locale}/login`} />
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[--color-primary]">{product.brand || categoryName}</p>
          <h1 className="mt-1 text-2xl font-black text-[--color-fg] sm:text-3xl">{translation?.name}</h1>
          <p className="mt-2 text-sm text-[--color-muted]">{translation?.shortDescription}</p>

          <div className="mt-3 flex items-center gap-2">
            <StarRating rating={product.rating ? Number(product.rating) : 0} showValue />
            <span className="text-xs text-[--color-muted]">
              ({product.reviewCount} {dict.product.reviewsCount})
            </span>
          </div>

          <div className="mt-6">
            <VariantSelector
              variants={variants.map((v) => ({ id: v.id, name: v.name, priceMinor: v.priceMinor, comparePriceMinor: v.comparePriceMinor, stock: v.stock }))}
              stockMode={product.stockMode}
              currency={ctx.currency}
              locale={locale}
              labels={{
                selectVariant: dict.product.selectVariant,
                addToCart: dict.product.addToCart,
                added: dict.product.addToCart,
                error: dict.errors.genericError,
                outOfStock: dict.product.outOfStock,
                quantity: dict.product.quantity,
              }}
            />
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-[--color-border] bg-[--color-card] p-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <div>
                <p className="text-sm font-semibold text-[--color-fg]">{dict.product.deliveryInfo}</p>
                <p className="text-xs text-[--color-muted]">{dict.product.deliveryInfoText}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-[--color-fg]">{dict.badges.verified}</p>
                <p className="text-xs text-[--color-muted]">SKU: {product.sku}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-bold text-[--color-fg]">{dict.product.description}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[--color-muted]">{translation?.description}</p>
          </section>

          {features.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-[--color-fg]">{dict.product.features}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[--color-muted]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-primary]" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {whatsIncluded.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-[--color-fg]">{dict.product.whatsIncluded}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {whatsIncluded.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[--color-muted]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {translation?.activationInstructions && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-[--color-fg]">{dict.product.activationInstructions}</h2>
              <p className="rounded-xl border border-[--color-border] bg-[--color-card] p-4 text-sm text-[--color-muted]">{translation.activationInstructions}</p>
            </section>
          )}

          {/* Reviews */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-[--color-fg]">
              {dict.product.reviews} ({reviewRows.length})
            </h2>
            {ctx.user ? (
              <div className="mb-5">
                <ReviewForm
                  productId={product.id}
                  labels={{ rating: dict.reviews.rating, title: dict.reviews.reviewTitle, comment: dict.reviews.comment, submit: dict.reviews.submit, thankYou: dict.reviews.thankYou }}
                />
              </div>
            ) : (
              <p className="mb-5 text-sm text-[--color-muted]">{dict.product.mustPurchaseToReview}</p>
            )}
            {reviewRows.length === 0 ? (
              <p className="text-sm text-[--color-muted]">{dict.product.noReviewsYet}</p>
            ) : (
              <div className="space-y-3">
                {reviewRows.map((r) => (
                  <div key={r.id} className="rounded-xl border border-[--color-border] bg-[--color-card] p-4">
                    <div className="flex items-center justify-between">
                      <StarRating rating={r.rating} />
                      {r.verifiedPurchase && <Badge tone="verified">{dict.reviews.verifiedPurchase}</Badge>}
                    </div>
                    {r.title && <p className="mt-2 text-sm font-semibold text-[--color-fg]">{r.title}</p>}
                    {r.comment && <p className="mt-1 text-sm text-[--color-muted]">{r.comment}</p>}
                    <p className="mt-2 text-xs text-[--color-muted]">
                      {r.firstName} {r.lastName?.charAt(0) ?? ""}.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 rounded-2xl border border-[--color-border] bg-[--color-card] p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-[--color-muted]">{dict.product.brand}</span>
            <span className="font-semibold text-[--color-fg]">{product.brand || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[--color-muted]">{dict.product.category}</span>
            <Link href={`/${locale}/category/${categorySlug}`} className="font-semibold text-[--color-primary] hover:underline">
              {categoryName}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-[--color-muted]">{dict.product.sku}</span>
            <span className="font-semibold text-[--color-fg]">{product.sku}</span>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-[--color-fg]">{dict.product.relatedProducts}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} currency={ctx.currency} locale={locale} dict={dict} isAuthenticated={!!ctx.user} wishlisted={wishlistIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
