import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { refundOrderAdmin, OrderError } from "@/lib/services/orders";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const result = await refundOrderAdmin({
      orderId: Number(id),
      amountMinor: body?.amountMinor ? Number(body.amountMinor) : undefined,
      reason: body?.reason,
      adminUserId: guard.user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "REFUND_FAILED", message: err instanceof Error ? err.message : undefined }, { status: 500 });
  }
}
