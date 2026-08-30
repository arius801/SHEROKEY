import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { orders, products, users, supportTickets, licenseKeys, reviews } from "@/db/schema";
import { sql, eq, gte, and } from "drizzle-orm";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'paid')::int`,
      revenueMinor: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${orders.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(orders);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentStats] = await db
    .select({
      revenueMinor: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${orders.paymentStatus} = 'paid'), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(gte(orders.createdAt, since));

  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const [activeProductCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, "active"));
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "customer"));
  const [openTickets] = await db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(eq(supportTickets.status, "open"));
  const [lowStockKeys] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(licenseKeys)
    .where(eq(licenseKeys.status, "available"));
  const [pendingReviews] = await db.select({ count: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.status, "pending"));
  const [fulfillmentIssues] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, "paid"), eq(orders.deliveryStatus, "processing")));

  const recentOrders = await db.select().from(orders).orderBy(sql`${orders.createdAt} desc`).limit(8);

  return NextResponse.json({
    totalOrders: orderStats?.count ?? 0,
    paidOrders: orderStats?.paidCount ?? 0,
    totalRevenueMinor: orderStats?.revenueMinor ?? 0,
    last30dRevenueMinor: recentStats?.revenueMinor ?? 0,
    last30dOrders: recentStats?.count ?? 0,
    productCount: productCount?.count ?? 0,
    activeProductCount: activeProductCount?.count ?? 0,
    customerCount: userCount?.count ?? 0,
    openTickets: openTickets?.count ?? 0,
    availableLicenseKeys: lowStockKeys?.count ?? 0,
    pendingReviews: pendingReviews?.count ?? 0,
    fulfillmentIssues: fulfillmentIssues?.count ?? 0,
    recentOrders,
  });
}
