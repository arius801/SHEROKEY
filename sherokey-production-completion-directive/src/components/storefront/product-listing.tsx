import { ProductCard } from "@/components/storefront/product-card";
import { SortSelect } from "@/components/storefront/sort-select";
import { Pagination } from "@/components/storefront/pagination";
import { PackageSearch } from "lucide-react";
import type { ProductSummary } from "@/lib/services/products";
import type { RequestContext } from "@/lib/request-context";

export function ProductListing({
  title,
  subtitle,
  items,
  total,
  page,
  pageSize,
  basePath,
  searchParams,
  sort,
  ctx,
  wishlistIds,
}: {
  title: string;
  subtitle?: string;
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  sort: string;
  ctx: RequestContext;
  wishlistIds: Set<number>;
}) {
  const dict = ctx.dict;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sortOptions = [
    { value: "popular", label: dict.filters.sort.popular },
    { value: "newest", label: dict.filters.sort.newest },
    { value: "rating", label: dict.filters.sort.bestRated },
    { value: "price_asc", label: dict.filters.sort.priceLowHigh },
    { value: "price_desc", label: dict.filters.sort.priceHighLow },
    { value: "discount", label: dict.filters.sort.biggestDiscount },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-fg] sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[--color-muted]">{subtitle}</p>}
          <p className="mt-1 text-xs text-[--color-muted]">
            {total} {total === 1 ? dict.cart.item : dict.cart.items}
          </p>
        </div>
        <SortSelect label={dict.filters.sortBy} options={sortOptions} current={sort} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[--color-border] py-24 text-center">
          <PackageSearch className="mb-4 h-10 w-10 text-[--color-muted]" />
          <p className="text-lg font-semibold text-[--color-fg]">{dict.search.noResults}</p>
          <p className="mt-1 text-sm text-[--color-muted]">{dict.search.noResultsDesc}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} currency={ctx.currency} locale={ctx.locale} dict={ctx.dict} isAuthenticated={!!ctx.user} wishlisted={wishlistIds.has(p.id)} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} basePath={basePath} searchParams={searchParams} />
        </>
      )}
    </div>
  );
}
