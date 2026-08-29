import "server-only";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { listProducts } from "@/lib/services/products";
import type { Locale } from "@/lib/i18n/locales";

export async function getWishlistProductIds(userId: number | null): Promise<Set<number>> {
  if (!userId) return new Set();
  const rows = await db.select({ productId: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  return new Set(rows.map((r) => r.productId));
}

export async function getWishlistDetailed(userId: number, locale: Locale) {
  const rows = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId)).orderBy(desc(wishlistItems.createdAt));
  if (rows.length === 0) return [];
  const productIds = rows.map((r) => r.productId);
  const { items } = await listProducts({ locale, ids: productIds, limit: productIds.length });
  const byId = new Map(items.map((i) => [i.id, i]));
  return rows.map((r) => byId.get(r.productId)).filter((p): p is NonNullable<typeof p> => !!p);
}
