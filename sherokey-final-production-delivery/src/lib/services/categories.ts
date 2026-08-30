import "server-only";
import { db } from "@/db";
import { categories, categoryTranslations, products } from "@/db/schema";
import { and, asc, eq, or, sql } from "drizzle-orm";
import type { Locale } from "@/lib/i18n/locales";

export type CategorySummary = {
  id: number;
  slug: string;
  icon: string | null;
  image: string | null;
  name: string;
  description: string;
  productCount: number;
  parentId: number | null;
};

export async function listCategories(locale: Locale): Promise<CategorySummary[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.status, "active"))
    .orderBy(asc(categories.sortOrder));

  const result: CategorySummary[] = [];
  for (const c of rows) {
    const trRows = await db
      .select()
      .from(categoryTranslations)
      .where(and(eq(categoryTranslations.categoryId, c.id), or(eq(categoryTranslations.locale, locale), eq(categoryTranslations.locale, "en"))));
    const tr = trRows.find((t) => t.locale === locale) ?? trRows.find((t) => t.locale === "en");
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.categoryId, c.id), eq(products.status, "active")));

    result.push({
      id: c.id,
      slug: c.slug,
      icon: c.icon,
      image: c.image,
      name: tr?.name ?? c.slug,
      description: tr?.description ?? "",
      productCount: countRows[0]?.count ?? 0,
      parentId: c.parentId,
    });
  }
  return result;
}

export async function getCategoryBySlug(slug: string, locale: Locale): Promise<CategorySummary | null> {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  const c = rows[0];
  if (!c) return null;
  const trRows = await db
    .select()
    .from(categoryTranslations)
    .where(and(eq(categoryTranslations.categoryId, c.id), or(eq(categoryTranslations.locale, locale), eq(categoryTranslations.locale, "en"))));
  const tr = trRows.find((t) => t.locale === locale) ?? trRows.find((t) => t.locale === "en");
  return {
    id: c.id,
    slug: c.slug,
    icon: c.icon,
    image: c.image,
    name: tr?.name ?? c.slug,
    description: tr?.description ?? "",
    productCount: 0,
    parentId: c.parentId,
  };
}
