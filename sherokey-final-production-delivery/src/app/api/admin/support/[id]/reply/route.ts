import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { addAdminReply } from "@/lib/services/support";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const result = await addAdminReply({
    id: Number(id),
    message,
    authorName: `${guard.user.firstName} ${guard.user.lastName}`.trim() || "Support",
    internal: !!body?.internal,
    adminUserId: guard.user.id,
  });
  if (!result) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
