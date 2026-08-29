import Link from "next/link";
import { Zap, PackageX } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import type { ProductSummary } from "@/lib/services/products";
import type { CurrencyConfig } from "@/lib/money";
import { priceLabels } from "@/lib/price-label";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n";

export function ProductCard({
  product,
  currency,
  locale,
  dict,
  isAuthenticated,
  wishlisted,
}: {
  product: ProductSummary;
  currency: CurrencyConfig;
  locale: Locale;
  dict: Dictionary;
  isAuthenticated: boolean;
  wishlisted: boolean;
}) {
  const { price, compare } = priceLabels(product.priceMinor, product.comparePriceMinor, currency, locale);
  const outOfStock = product.stockMode === "quantity" && product.stockQuantity <= 0;
  const lowStock = product.stockMode === "quantity" && product.stockQuantity > 0 && product.stockQuantity <= 5;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-card] transition hover:-translate-y-1 hover:border-[--color-primary]/50 hover:shadow-xl hover:shadow-[--color-primary]/5">
      <Link href={`/${locale}/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-[--color-primary]/30">{product.name.slice(0, 2).toUpperCase()}</div>
        )}
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {product.bestseller && <Badge tone="bestseller">{dict.badges.bestseller}</Badge>}
          {product.isNew && <Badge tone="new">{dict.badges.new}</Badge>}
          {product.onSale && <Badge tone="sale">-{product.discountPercent}%</Badge>}
        </div>
      </Link>
      <div className="absolute end-2 top-2">
        <WishlistButton productId={product.id} initialActive={wishlisted} isAuthenticated={isAuthenticated} loginHref={`/${locale}/login`} size="sm" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[--color-muted]">{product.categoryName || product.brand}</p>
        <Link href={`/${locale}/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-[--color-fg] hover:text-[--color-primary]">
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} size={13} />
          <span className="text-xs text-[--color-muted]">({product.reviewCount})</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[--color-fg]">{price}</span>
              {compare && <span className="text-xs text-[--color-muted] line-through">{compare}</span>}
            </div>
            {outOfStock ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400">
                <PackageX className="h-3 w-3" /> {dict.product.outOfStock}
              </span>
            ) : lowStock ? (
              <span className="text-[11px] font-medium text-orange-400">{dict.badges.limited}</span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400">
                <Zap className="h-3 w-3" /> {dict.badges.instant}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
