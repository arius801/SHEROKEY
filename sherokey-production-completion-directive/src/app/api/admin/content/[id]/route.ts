import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { upsertContentPage, deleteContentPage, type ContentPageInput } from "@/lib/services/content";
import { logAudit } from "@/lib/services/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as ContentPageInput | null;
  if (!body?.slug) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await upsertContentPage(Number(id), body);
  await logAudit({ userId: guard.user.id, action: "admin.content.updated", entityType: "content_page", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  await deleteContentPage(Number(id));
  await logAudit({ userId: guard.user.id, action: "admin.content.deleted", entityType: "content_page", entityId: id });
  return NextResponse.json({ ok: true });
}
