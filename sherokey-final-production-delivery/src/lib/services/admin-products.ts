import "server-only";
import { db } from "@/db";
import {
  products,
  productTranslations,
  productVariants,
  productVariantTranslations,
  categories,
  licenseKeys,
  cartItems,
  orderItems,
} from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { LOCALES } from "@/lib/i18n/locales";

export type AdminProductTranslationInput = {
  locale: string;
  name: string;
  shortDescription?: string;
  description?: string;
  features?: string[];
  whatsIncluded?: string[];
  systemRequirements?: string;
  activationInstructions?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type AdminVariantInput = {
  id?: number;
  sku: string;
  duration?: string;
  region?: string;
  platform?: string;
  licenseType?: string;
  priceMinor: number;
  comparePriceMinor?: number | null;
  stock: number;
  status?: string;
  sortOrder?: number;
  translations: { locale: string; name: string }[];
};

export type AdminProductInput = {
  slug: string;
  sku: string;
  brand?: string;
  categoryId?: number | null;
  productType: string;
  fulfillmentType: string;
  basePriceMinor: number;
  comparePriceMinor?: number | null;
  costPriceMinor?: number | null;
  status: string;
  featured?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  stockMode: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  image?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  translations: AdminProductTranslationInput[];
  variants: AdminVariantInput[];
  deletedVariantIds?: number[];
};

export async function listProductsAdmin(params: { search?: string; status?: string; limit?: number; offset?: number } = {}) {
  const conditions = [];
  if (params.status) conditions.push(eq(products.status, params.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({ product: products, categoryName: categories.slug })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(params.limit ?? 100)
    .offset(params.offset ?? 0);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);

  return { items: rows, total: countRows[0]?.count ?? rows.length };
}

export async function getProductAdmin(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const product = rows[0];
  if (!product) return null;
  const translations = await db.select().from(productTranslations).where(eq(productTranslations.productId, id));
  const variantRows = await db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(productVariants.sortOrder);
  const variants = [];
  for (const v of variantRows) {
    const tr = await db.select().from(productVariantTranslations).where(eq(productVariantTranslations.variantId, v.id));
    const keyCounts = await db
      .select({ status: licenseKeys.status, count: sql<number>`count(*)::int` })
      .from(licenseKeys)
      .where(eq(licenseKeys.variantId, v.id))
      .groupBy(licenseKeys.status);
    variants.push({ ...v, translations: tr, licenseKeyCounts: keyCounts });
  }
  return { product, translations, variants };
}

export async function createProductAdmin(input: AdminProductInput) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        slug: input.slug,
        sku: input.sku,
        brand: input.brand ?? "",
        categoryId: input.categoryId ?? null,
        productType: input.productType,
        fulfillmentType: input.fulfillmentType,
        basePriceMinor: input.basePriceMinor,
        comparePriceMinor: input.comparePriceMinor ?? null,
        costPriceMinor: input.costPriceMinor ?? null,
        status: input.status,
        featured: !!input.featured,
        bestseller: !!input.bestseller,
        isNew: !!input.isNew,
        stockMode: input.stockMode,
        stockQuantity: input.stockQuantity ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        image: input.image ?? null,
        saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
        saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
      })
      .returning();

    await syncTranslationsAndVariants(tx, product.id, input);
    return product;
  });
}

export async function updateProductAdmin(id: number, input: AdminProductInput) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set({
        slug: input.slug,
        sku: input.sku,
        brand: input.brand ?? "",
        categoryId: input.categoryId ?? null,
        productType: input.productType,
        fulfillmentType: input.fulfillmentType,
        basePriceMinor: input.basePriceMinor,
        comparePriceMinor: input.comparePriceMinor ?? null,
        costPriceMinor: input.costPriceMinor ?? null,
        status: input.status,
        featured: !!input.featured,
        bestseller: !!input.bestseller,
        isNew: !!input.isNew,
        stockMode: input.stockMode,
        stockQuantity: input.stockQuantity ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        image: input.image ?? null,
        saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
        saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await syncTranslationsAndVariants(tx, id, input);
    return product;
  });
}

async function syncTranslationsAndVariants(tx: any, productId: number, input: AdminProductInput) {
  for (const locale of LOCALES) {
    const tr = input.translations.find((t) => t.locale === locale);
    if (!tr) continue;
    const existing = await tx
      .select()
      .from(productTranslations)
      .where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, locale)))
      .limit(1);
    const values = {
      productId,
      locale,
      name: tr.name,
      shortDescription: tr.shortDescription ?? "",
      description: tr.description ?? "",
      features: tr.features ?? [],
      whatsIncluded: tr.whatsIncluded ?? [],
      systemRequirements: tr.systemRequirements ?? "",
      activationInstructions: tr.activationInstructions ?? "",
      seoTitle: tr.seoTitle ?? "",
      seoDescription: tr.seoDescription ?? "",
    };
    if (existing[0]) {
      await tx.update(productTranslations).set(values).where(eq(productTranslations.id, existing[0].id));
    } else {
      await tx.insert(productTranslations).values(values);
    }
  }

  for (const variant of input.variants) {
    let variantId = variant.id;
    if (variantId) {
      await tx
        .update(productVariants)
        .set({
          sku: variant.sku,
          duration: variant.duration ?? null,
          region: variant.region ?? null,
          platform: variant.platform ?? null,
          licenseType: variant.licenseType ?? null,
          priceMinor: variant.priceMinor,
          comparePriceMinor: variant.comparePriceMinor ?? null,
          stock: variant.stock,
          status: variant.status ?? "active",
          sortOrder: variant.sortOrder ?? 0,
        })
        .where(eq(productVariants.id, variantId));
    } else {
      const [created] = await tx
        .insert(productVariants)
        .values({
          productId,
          sku: variant.sku,
          duration: variant.duration ?? null,
          region: variant.region ?? null,
          platform: variant.platform ?? null,
          licenseType: variant.licenseType ?? null,
          priceMinor: variant.priceMinor,
          comparePriceMinor: variant.comparePriceMinor ?? null,
          stock: variant.stock,
          status: variant.status ?? "active",
          sortOrder: variant.sortOrder ?? 0,
        })
        .returning();
      variantId = created.id;
    }
    const resolvedVariantId: number = variantId!;

    for (const locale of LOCALES) {
      const trName = variant.translations.find((t) => t.locale === locale)?.name;
      if (!trName) continue;
      const existing = await tx
        .select()
        .from(productVariantTranslations)
        .where(and(eq(productVariantTranslations.variantId, resolvedVariantId), eq(productVariantTranslations.locale, locale)))
        .limit(1);
      if (existing[0]) {
        await tx.update(productVariantTranslations).set({ name: trName }).where(eq(productVariantTranslations.id, existing[0].id));
      } else {
        await tx.insert(productVariantTranslations).values({ variantId: resolvedVariantId, locale, name: trName });
      }
    }
  }

  for (const variantId of input.deletedVariantIds ?? []) {
    const referenced = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.variantId, variantId));
    if ((referenced[0]?.count ?? 0) > 0) {
      // Never delete a variant that has been sold — archive it instead to preserve order history integrity.
      await tx.update(productVariants).set({ status: "archived" }).where(eq(productVariants.id, variantId));
    } else {
      await tx.delete(cartItems).where(eq(cartItems.variantId, variantId));
      await tx.delete(productVariants).where(eq(productVariants.id, variantId));
    }
  }
}

export async function deleteProductAdmin(id: number) {
  const referenced = await db.select({ count: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, id));
  if ((referenced[0]?.count ?? 0) > 0) {
    await db.update(products).set({ status: "archived" }).where(eq(products.id, id));
    return { archived: true };
  }
  await db.delete(products).where(eq(products.id, id));
  return { archived: false };
}
