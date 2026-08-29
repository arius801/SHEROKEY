import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { getProductAdmin, updateProductAdmin, deleteProductAdmin, type AdminProductInput } from "@/lib/services/admin-products";
import { logAudit } from "@/lib/services/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const product = await getProductAdmin(Number(id));
  if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as AdminProductInput | null;
  if (!body?.slug || !body?.sku) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    const product = await updateProductAdmin(Number(id), body);
    await logAudit({ userId: guard.user.id, action: "admin.product.updated", entityType: "product", entityId: id });
    return NextResponse.json({ product });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "UPDATE_FAILED", message: err instanceof Error ? err.message : undefined }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const result = await deleteProductAdmin(Number(id));
  await logAudit({ userId: guard.user.id, action: "admin.product.deleted", entityType: "product", entityId: id, metadata: result });
  return NextResponse.json(result);
}
