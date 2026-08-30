import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { listFaqsAdmin, upsertFaq, type FaqInput } from "@/lib/services/content";
import { logAudit } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const items = await listFaqsAdmin();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as FaqInput | null;
  if (!body?.category || !body?.translations?.length) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const id = await upsertFaq(null, body);
  await logAudit({ userId: guard.user.id, action: "admin.faq.created", entityType: "faq", entityId: id });
  return NextResponse.json({ id }, { status: 201 });
}
