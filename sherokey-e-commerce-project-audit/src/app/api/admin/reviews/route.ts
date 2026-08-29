import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { reviews, products, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const status = req.nextUrl.searchParams.get("status");

  const rows = await db
    .select({
      review: reviews,
      productSlug: products.slug,
      productSku: products.sku,
      userEmail: users.email,
    })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .leftJoin(users, eq(users.id, reviews.userId))
    .where(status ? and(eq(reviews.status, status)) : undefined)
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json({ items: rows });
}
