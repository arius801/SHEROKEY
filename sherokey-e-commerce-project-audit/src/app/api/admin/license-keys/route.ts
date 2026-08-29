import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { licenseKeys, productVariants, products } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { encryptSecret, maskKey } from "@/lib/crypto";
import { logAudit } from "@/lib/services/audit";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const productId = req.nextUrl.searchParams.get("productId");
  const variantId = req.nextUrl.searchParams.get("variantId");
  const status = req.nextUrl.searchParams.get("status");

  const conditions = [];
  if (productId) conditions.push(eq(licenseKeys.productId, Number(productId)));
  if (variantId) conditions.push(eq(licenseKeys.variantId, Number(variantId)));
  if (status) conditions.push(eq(licenseKeys.status, status));

  const rows = await db
    .select({
      id: licenseKeys.id,
      productId: licenseKeys.productId,
      variantId: licenseKeys.variantId,
      status: licenseKeys.status,
      encryptedKey: licenseKeys.encryptedKey,
      orderId: licenseKeys.orderId,
      soldAt: licenseKeys.soldAt,
      createdAt: licenseKeys.createdAt,
      productSku: products.sku,
      variantSku: productVariants.sku,
    })
    .from(licenseKeys)
    .leftJoin(products, eq(products.id, licenseKeys.productId))
    .leftJoin(productVariants, eq(productVariants.id, licenseKeys.variantId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(licenseKeys.createdAt))
    .limit(500);

  const { decryptSecret } = await import("@/lib/crypto");
  const items = rows.map((r) => ({
    ...r,
    maskedKey: maskKey(decryptSecret(r.encryptedKey)),
    encryptedKey: undefined,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const productId = Number(body?.productId);
  const variantId = body?.variantId ? Number(body.variantId) : null;
  const keysText: string = body?.keys ?? "";
  const keyList = keysText
    .split("\n")
    .map((k: string) => k.trim())
    .filter(Boolean);

  if (!productId || keyList.length === 0) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const values = keyList.map((key) => ({
    productId,
    variantId,
    encryptedKey: encryptSecret(key),
    status: "available" as const,
  }));

  await db.insert(licenseKeys).values(values);
  await logAudit({ userId: guard.user.id, action: "admin.license_keys.bulk_added", entityType: "product", entityId: productId, metadata: { count: values.length } });

  return NextResponse.json({ added: values.length }, { status: 201 });
}
