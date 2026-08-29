import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listProducts, type ProductFilters } from "@/lib/services/products";
import { getWishlistProductIds } from "@/lib/services/wishlist";
import { ProductListing } from "@/components/storefront/product-listing";

const PAGE_SIZE = 24;

export const revalidate = 0;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const query = sp.q?.trim() || "";

  const ctx = await getRequestContext(locale);
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = (sp.sort as ProductFilters["sort"]) || "popular";

  const filters: ProductFilters = { locale, search: query || undefined, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  const [{ items, total }, wishlistIds] = query
    ? await Promise.all([listProducts(filters), getWishlistProductIds(ctx.user?.id ?? null)])
    : [{ items: [], total: 0 }, await getWishlistProductIds(ctx.user?.id ?? null)];

  return (
    <ProductListing
      title={query ? `${ctx.dict.search.resultsFor} "${query}"` : ctx.dict.search.placeholder}
      items={items}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      basePath={`/${locale}/search`}
      searchParams={sp}
      sort={sort}
      ctx={ctx}
      wishlistIds={wishlistIds}
    />
  );
}
