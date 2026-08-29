import "server-only";
import { db } from "@/db";
import {
  products,
  productTranslations,
  productVariants,
  productVariantTranslations,
  categories,
  categoryTranslations,
  reviews,
} from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { effectivePrice } from "@/lib/services/pricing";
import type { Locale } from "@/lib/i18n/locales";

export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  brand: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  categoryName: string;
  categorySlug: string;
  productType: string;
  featured: boolean;
  bestseller: boolean;
  isNew: boolean;
  priceMinor: number;
  comparePriceMinor: number | null;
  discountPercent: number;
  onSale: boolean;
  stockMode: string;
  stockQuantity: number;
  createdAt: Date;
};

async function withFallbackName(productId: number, locale: Locale) {
  const rows = await db
    .select()
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, productId), or(eq(productTranslations.locale, locale), eq(productTranslations.locale, "en"))));
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "en") ?? rows[0];
}

export type ProductFilters = {
  locale: Locale;
  categorySlug?: string;
  search?: string;
  featured?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  onSale?: boolean;
  productType?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  minRating?: number;
  sort?: "popular" | "newest" | "rating" | "price_asc" | "price_desc" | "discount";
  limit?: number;
  offset?: number;
};

export async function listProducts(filters: ProductFilters): Promise<{ items: ProductSummary[]; total: number }> {
  const conditions = [eq(products.status, "active")];

  if (filters.categorySlug) {
    const cat = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, filters.categorySlug)).limit(1);
    if (cat[0]) conditions.push(eq(products.categoryId, cat[0].id));
    else conditions.push(sql`false`);
  }
  if (filters.featured) conditions.push(eq(products.featured, true));
  if (filters.bestseller) conditions.push(eq(products.bestseller, true));
  if (filters.isNew) conditions.push(eq(products.isNew, true));
  if (filters.productType) conditions.push(eq(products.productType, filters.productType));
  if (filters.minRating) conditions.push(gte(products.rating, String(filters.minRating)));
  if (filters.minPriceMinor != null) conditions.push(gte(products.basePriceMinor, filters.minPriceMinor));
  if (filters.maxPriceMinor != null) conditions.push(lte(products.basePriceMinor, filters.maxPriceMinor));

  let productIdsForSearch: number[] | null = null;
  if (filters.search) {
    const term = `%${filters.search}%`;
    const matches = await db
      .selectDistinct({ id: productTranslations.productId })
      .from(productTranslations)
      .where(or(ilike(productTranslations.name, term), ilike(productTranslations.shortDescription, term), ilike(productTranslations.description, term)));
    const brandMatches = await db.select({ id: products.id }).from(products).where(ilike(products.brand, term));
    const skuMatches = await db.select({ id: products.id }).from(products).where(ilike(products.sku, term));
    productIdsForSearch = Array.from(new Set([...matches.map((m) => m.id), ...brandMatches.map((m) => m.id), ...skuMatches.map((m) => m.id)]));
    if (productIdsForSearch.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(products.id, productIdsForSearch));
  }

  let orderBy = desc(products.reviewCount);
  if (filters.sort === "newest") orderBy = desc(products.createdAt);
  else if (filters.sort === "rating") orderBy = desc(products.rating);
  else if (filters.sort === "price_asc") orderBy = asc(products.basePriceMinor);
  else if (filters.sort === "price_desc") orderBy = desc(products.basePriceMinor);

  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(filters.limit ?? 24)
    .offset(filters.offset ?? 0);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(and(...conditions));

  const items: ProductSummary[] = [];
  for (const p of rows) {
    const tr = await withFallbackName(p.id, filters.locale);
    let categoryName = "";
    let categorySlug = "";
    if (p.categoryId) {
      const catRows = await db
        .select({ slug: categories.slug, name: categoryTranslations.name, locale: categoryTranslations.locale })
        .from(categories)
        .leftJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
        .where(eq(categories.id, p.categoryId));
      const match = catRows.find((c) => c.locale === filters.locale) ?? catRows.find((c) => c.locale === "en") ?? catRows[0];
      categoryName = match?.name ?? "";
      categorySlug = match?.slug ?? "";
    }

    const price = effectivePrice({
      priceMinor: p.basePriceMinor,
      comparePriceMinor: p.comparePriceMinor,
      saleStartsAt: p.saleStartsAt,
      saleEndsAt: p.saleEndsAt,
    });

    if (filters.onSale && !price.onSale) continue;

    items.push({
      id: p.id,
      slug: p.slug,
      name: tr?.name ?? p.slug,
      shortDescription: tr?.shortDescription ?? "",
      brand: p.brand ?? "",
      image: p.image,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      categoryName,
      categorySlug,
      productType: p.productType,
      featured: p.featured,
      bestseller: p.bestseller,
      isNew: p.isNew,
      priceMinor: price.priceMinor,
      comparePriceMinor: price.comparePriceMinor,
      discountPercent: price.discountPercent,
      onSale: price.onSale,
      stockMode: p.stockMode,
      stockQuantity: p.stockQuantity,
      createdAt: p.createdAt,
    });
  }

  if (filters.sort === "discount") {
    items.sort((a, b) => b.discountPercent - a.discountPercent);
  }

  return { items, total: countRows[0]?.count ?? items.length };
}

export async function getProductDetail(slug: string, locale: Locale) {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = rows[0];
  if (!product || product.status !== "active") return null;

  const tr = await withFallbackName(product.id, locale);

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.status, "active")))
    .orderBy(asc(productVariants.sortOrder));

  const variants = [];
  for (const v of variantRows) {
    const nameRows = await db
      .select()
      .from(productVariantTranslations)
      .where(and(eq(productVariantTranslations.variantId, v.id), or(eq(productVariantTranslations.locale, locale), eq(productVariantTranslations.locale, "en"))));
    const name = nameRows.find((n) => n.locale === locale)?.name ?? nameRows.find((n) => n.locale === "en")?.name ?? v.sku;
    variants.push({ ...v, name });
  }

  let categoryName = "";
  let categorySlug = "";
  if (product.categoryId) {
    const catRows = await db
      .select({ slug: categories.slug, name: categoryTranslations.name, locale: categoryTranslations.locale })
      .from(categories)
      .leftJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
      .where(eq(categories.id, product.categoryId));
    const match = catRows.find((c) => c.locale === locale) ?? catRows.find((c) => c.locale === "en") ?? catRows[0];
    categoryName = match?.name ?? "";
    categorySlug = match?.slug ?? "";
  }

  const price = effectivePrice({
    priceMinor: product.basePriceMinor,
    comparePriceMinor: product.comparePriceMinor,
    saleStartsAt: product.saleStartsAt,
    saleEndsAt: product.saleEndsAt,
  });

  const reviewStats = await db
    .select({ rating: reviews.rating, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, "approved")))
    .groupBy(reviews.rating);

  return {
    product,
    translation: tr,
    variants,
    categoryName,
    categorySlug,
    price,
    reviewStats,
  };
}

export async function getRelatedProducts(categoryId: number | null, excludeId: number, locale: Locale, limit = 4) {
  if (!categoryId) return [];
  const catRows = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!catRows[0]) return [];
  const { items } = await listProducts({ locale, categorySlug: catRows[0].slug, limit: limit + 1 });
  const filtered = items.filter((i) => i.id !== excludeId);
  return filtered.slice(0, limit);
}
