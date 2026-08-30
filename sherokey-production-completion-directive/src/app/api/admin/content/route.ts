import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { listContentPagesAdmin, upsertContentPage, type ContentPageInput } from "@/lib/services/content";
import { logAudit } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const items = await listContentPagesAdmin();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as ContentPageInput | null;
  if (!body?.slug || !body?.translations?.length) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const id = await upsertContentPage(null, body);
  await logAudit({ userId: guard.user.id, action: "admin.content.created", entityType: "content_page", entityId: id });
  return NextResponse.json({ id }, { status: 201 });
}
