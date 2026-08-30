import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/services/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  await db
    .update(coupons)
    .set({
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
    .where(eq(coupons.id, Number(id)));

  await logAudit({ userId: guard.user.id, action: "admin.coupon.updated", entityType: "coupon", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await db.delete(coupons).where(eq(coupons.id, Number(id)));
  await logAudit({ userId: guard.user.id, action: "admin.coupon.deleted", entityType: "coupon", entityId: id });
  return NextResponse.json({ ok: true });
}
