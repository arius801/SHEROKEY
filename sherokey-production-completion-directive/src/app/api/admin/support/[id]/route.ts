import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { getTicketAdmin, updateTicketAdmin } from "@/lib/services/support";
import { logAudit } from "@/lib/services/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const result = await getTicketAdmin(Number(id));
  if (!result) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await updateTicketAdmin(Number(id), {
    status: body.status,
    priority: body.priority,
    assignedToUserId: body.assignedToUserId === null ? null : body.assignedToUserId ? Number(body.assignedToUserId) : undefined,
  });
  await logAudit({ userId: guard.user.id, action: "admin.support.updated", entityType: "support_ticket", entityId: id, metadata: body });
  return NextResponse.json({ ok: true });
}
