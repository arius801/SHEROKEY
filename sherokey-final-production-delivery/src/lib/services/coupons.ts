import "server-only";
import { db } from "@/db";
import { coupons, couponUsages } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type CouponValidationResult =
  | { valid: true; coupon: typeof coupons.$inferSelect; discountMinor: number }
  | { valid: false; reason: string };

export async function validateCoupon(
  code: string,
  subtotalMinor: number,
  userId: number | null
): Promise<CouponValidationResult> {
  const rows = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase())).limit(1);
  const coupon = rows[0];
  if (!coupon) return { valid: false, reason: "not_found" };
  if (coupon.status !== "active") return { valid: false, reason: "inactive" };

  const now = new Date();
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return { valid: false, reason: "not_started" };
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) return { valid: false, reason: "expired" };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { valid: false, reason: "usage_limit" };
  if (subtotalMinor < coupon.minimumOrderMinor) return { valid: false, reason: "minimum_order" };

  if (userId && coupon.perUserLimit) {
    const usageCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsages)
      .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, userId)));
    if ((usageCount[0]?.count ?? 0) >= coupon.perUserLimit) return { valid: false, reason: "per_user_limit" };
  }

  let discountMinor = 0;
  if (coupon.type === "percentage") {
    discountMinor = Math.round((subtotalMinor * Number(coupon.value)) / 100);
  } else {
    discountMinor = Math.round(Number(coupon.value) * 100);
  }
  if (coupon.maximumDiscountMinor != null) {
    discountMinor = Math.min(discountMinor, coupon.maximumDiscountMinor);
  }
  discountMinor = Math.min(discountMinor, subtotalMinor);

  return { valid: true, coupon, discountMinor };
}

export async function recordCouponUsage(couponId: number, userId: number | null, orderId: number, discountMinor: number) {
  await db.insert(couponUsages).values({ couponId, userId, orderId, discountMinor });
  await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, couponId));
}
