import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/services/audit";

const ALLOWED_ROLES = ["customer", "manager", "admin"];
const ALLOWED_STATUS = ["active", "disabled"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  // Only a full admin (not a manager) may change roles — prevents privilege escalation by managers.
  if (body?.role) {
    if (guard.user.role !== "admin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (!ALLOWED_ROLES.includes(body.role)) return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
    if (Number(id) === guard.user.id) return NextResponse.json({ error: "CANNOT_MODIFY_SELF" }, { status: 400 });
    await db.update(users).set({ role: body.role, updatedAt: new Date() }).where(eq(users.id, Number(id)));
  }

  if (body?.status) {
    if (!ALLOWED_STATUS.includes(body.status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    if (Number(id) === guard.user.id) return NextResponse.json({ error: "CANNOT_MODIFY_SELF" }, { status: 400 });
    await db.update(users).set({ status: body.status, updatedAt: new Date() }).where(eq(users.id, Number(id)));
  }

  await logAudit({ userId: guard.user.id, action: "admin.user.updated", entityType: "user", entityId: id, metadata: body });
  return NextResponse.json({ ok: true });
}
