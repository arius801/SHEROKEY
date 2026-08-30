import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { listProductsAdmin, createProductAdmin, type AdminProductInput } from "@/lib/services/admin-products";
import { logAudit } from "@/lib/services/audit";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const result = await listProductsAdmin({ status });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as AdminProductInput | null;
  if (!body?.slug || !body?.sku || !body?.translations?.length) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  try {
    const product = await createProductAdmin(body);
    await logAudit({ userId: guard.user.id, action: "admin.product.created", entityType: "product", entityId: product.id });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "CREATE_FAILED", message: err instanceof Error ? err.message : undefined }, { status: 400 });
  }
}
