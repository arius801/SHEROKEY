import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { categories, categoryTranslations, products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { LOCALES } from "@/lib/i18n/locales";
import { logAudit } from "@/lib/services/audit";

type Body = {
  slug: string;
  icon?: string;
  image?: string | null;
  sortOrder?: number;
  status?: string;
  translations: { locale: string; name: string; description?: string; seoTitle?: string; seoDescription?: string }[];
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.slug) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  await db
    .update(categories)
    .set({ slug: body.slug, icon: body.icon ?? "sparkles", image: body.image ?? null, sortOrder: body.sortOrder ?? 0, status: body.status ?? "active" })
    .where(eq(categories.id, Number(id)));

  for (const locale of LOCALES) {
    const tr = body.translations.find((t) => t.locale === locale);
    if (!tr) continue;
    const existing = await db
      .select()
      .from(categoryTranslations)
      .where(and(eq(categoryTranslations.categoryId, Number(id)), eq(categoryTranslations.locale, locale)))
      .limit(1);
    const values = { name: tr.name, description: tr.description ?? "", seoTitle: tr.seoTitle ?? "", seoDescription: tr.seoDescription ?? "" };
    if (existing[0]) {
      await db.update(categoryTranslations).set(values).where(eq(categoryTranslations.id, existing[0].id));
    } else {
      await db.insert(categoryTranslations).values({ categoryId: Number(id), locale, ...values });
    }
  }

  await logAudit({ userId: guard.user.id, action: "admin.category.updated", entityType: "category", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const referenced = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.categoryId, Number(id)));
  if ((referenced[0]?.count ?? 0) > 0) {
    await db.update(categories).set({ status: "hidden" }).where(eq(categories.id, Number(id)));
    return NextResponse.json({ hidden: true });
  }
  await db.delete(categories).where(eq(categories.id, Number(id)));
  await logAudit({ userId: guard.user.id, action: "admin.category.deleted", entityType: "category", entityId: id });
  return NextResponse.json({ deleted: true });
}
