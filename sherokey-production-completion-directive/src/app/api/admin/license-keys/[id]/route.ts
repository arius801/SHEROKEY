import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { licenseKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/services/audit";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const rows = await db.select().from(licenseKeys).where(eq(licenseKeys.id, Number(id))).limit(1);
  const key = rows[0];
  if (!key) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (key.status === "sold") {
    // Never delete a key that has already been delivered to a customer — mark it
    // invalid instead so inventory counts and audit history stay accurate.
    await db.update(licenseKeys).set({ status: "invalid" }).where(eq(licenseKeys.id, key.id));
  } else {
    await db.delete(licenseKeys).where(eq(licenseKeys.id, key.id));
  }
  await logAudit({ userId: guard.user.id, action: "admin.license_key.removed", entityType: "license_key", entityId: id });
  return NextResponse.json({ ok: true });
}
