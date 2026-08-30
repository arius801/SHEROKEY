import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { reviews, products } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { logAudit } from "@/lib/services/audit";

async function refreshProductRating(productId: number) {
  const [agg] = await db
    .select({ avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")));
  await db
    .update(products)
    .set({ rating: Number(agg?.avg ?? 0).toFixed(2), reviewCount: agg?.count ?? 0 })
    .where(eq(products.id, productId));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.status || !["approved", "rejected", "pending"].includes(body.status)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const rows = await db.select().from(reviews).where(eq(reviews.id, Number(id))).limit(1);
  const review = rows[0];
  if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await db.update(reviews).set({ status: body.status }).where(eq(reviews.id, Number(id)));
  await refreshProductRating(review.productId);
  await logAudit({ userId: guard.user.id, action: "admin.review.moderated", entityType: "review", entityId: id, metadata: { status: body.status } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const rows = await db.select().from(reviews).where(eq(reviews.id, Number(id))).limit(1);
  const review = rows[0];
  if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.delete(reviews).where(eq(reviews.id, Number(id)));
  await refreshProductRating(review.productId);
  await logAudit({ userId: guard.user.id, action: "admin.review.deleted", entityType: "review", entityId: id });
  return NextResponse.json({ ok: true });
}
