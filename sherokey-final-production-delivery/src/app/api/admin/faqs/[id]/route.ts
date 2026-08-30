import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { upsertFaq, deleteFaq, type FaqInput } from "@/lib/services/content";
import { logAudit } from "@/lib/services/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as FaqInput | null;
  if (!body?.category) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await upsertFaq(Number(id), body);
  await logAudit({ userId: guard.user.id, action: "admin.faq.updated", entityType: "faq", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await deleteFaq(Number(id));
  await logAudit({ userId: guard.user.id, action: "admin.faq.deleted", entityType: "faq", entityId: id });
  return NextResponse.json({ ok: true });
}
