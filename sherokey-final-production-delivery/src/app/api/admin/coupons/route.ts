import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { logAudit } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const items = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = await req.json().catch(() => null);
  if (!body?.code || !body?.type || body?.value == null) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        code: String(body.code).toUpperCase().trim(),
        description: body.description ?? "",
        type: body.type,
        value: String(body.value),
        minimumOrderMinor: Number(body.minimumOrderMinor ?? 0),
        maximumDiscountMinor: body.maximumDiscountMinor ? Number(body.maximumDiscountMinor) : null,
        usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
        perUserLimit: body.perUserLimit ? Number(body.perUserLimit) : 1,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        status: body.status ?? "active",
      })
      .returning();
    await logAudit({ userId: guard.user.id, action: "admin.coupon.created", entityType: "coupon", entityId: coupon.id });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "CREATE_FAILED", message: err instanceof Error ? err.message : undefined }, { status: 400 });
  }
}
