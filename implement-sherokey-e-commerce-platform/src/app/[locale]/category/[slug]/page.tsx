import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listProducts, type ProductFilters } from "@/lib/services/products";
import { getCategoryBySlug } from "@/lib/services/categories";
import { getWishlistProductIds } from "@/lib/services/wishlist";
import { ProductListing } from "@/components/storefront/product-listing";

const PAGE_SIZE = 24;

export const revalidate = 0;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;

  const ctx = await getRequestContext(locale);
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const sort = (sp.sort as ProductFilters["sort"]) || "popular";

  const filters: ProductFilters = { locale, categorySlug: slug, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  const [{ items, total }, wishlistIds] = await Promise.all([listProducts(filters), getWishlistProductIds(ctx.user?.id ?? null)]);

  return (
    <ProductListing
      title={category.name}
      subtitle={category.description}
      items={items}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      basePath={`/${locale}/category/${slug}`}
      searchParams={sp}
      sort={sort}
      ctx={ctx}
      wishlistIds={wishlistIds}
    />
  );
}
