import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { getOrderAdmin, updateOrderStatusAdmin } from "@/lib/services/orders";
import { logAudit } from "@/lib/services/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const order = await getOrderAdmin(Number(id));
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await updateOrderStatusAdmin(Number(id), body.status);
  await logAudit({ userId: guard.user.id, action: "admin.order.status_updated", entityType: "order", entityId: id, metadata: { status: body.status } });
  return NextResponse.json({ ok: true });
}
