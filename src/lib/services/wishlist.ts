import "server-only";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWishlistProductIds(userId: number | null): Promise<Set<number>> {
  if (!userId) return new Set();
  const rows = await db.select({ productId: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  return new Set(rows.map((r) => r.productId));
}
