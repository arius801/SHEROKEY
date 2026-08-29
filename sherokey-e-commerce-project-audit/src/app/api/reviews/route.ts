import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reviews, orderItems, orders, products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  comment: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = rateLimit(`review:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const product = await db.select().from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!product[0]) return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });

  const purchaseRows = await db
    .select({ orderId: orderItems.orderId, orderItemId: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, parsed.data.productId), eq(orders.userId, user.id), eq(orders.paymentStatus, "paid")))
    .limit(1);

  const verifiedPurchase = purchaseRows.length > 0;

  const existing = await db.select().from(reviews).where(and(eq(reviews.productId, parsed.data.productId), eq(reviews.userId, user.id))).limit(1);
  if (existing[0]) return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });

  await db.insert(reviews).values({
    productId: parsed.data.productId,
    userId: user.id,
    orderId: purchaseRows[0]?.orderId,
    orderItemId: purchaseRows[0]?.orderItemId,
    rating: parsed.data.rating,
    title: parsed.data.title,
    comment: parsed.data.comment,
    status: "pending",
    verifiedPurchase,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
