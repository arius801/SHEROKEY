import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { categories, categoryTranslations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LOCALES } from "@/lib/i18n/locales";
import { logAudit } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const rows = await db.select().from(categories).orderBy(categories.sortOrder);
  const items = [];
  for (const c of rows) {
    const translations = await db.select().from(categoryTranslations).where(eq(categoryTranslations.categoryId, c.id));
    items.push({ ...c, translations });
  }
  return NextResponse.json({ items });
}

type Body = {
  slug: string;
  icon?: string;
  image?: string | null;
  sortOrder?: number;
  status?: string;
  translations: { locale: string; name: string; description?: string; seoTitle?: string; seoDescription?: string }[];
};

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.slug || !body?.translations?.length) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const [category] = await db
    .insert(categories)
    .values({ slug: body.slug, icon: body.icon ?? "sparkles", image: body.image ?? null, sortOrder: body.sortOrder ?? 0, status: body.status ?? "active" })
    .returning();

  for (const locale of LOCALES) {
    const tr = body.translations.find((t) => t.locale === locale);
    if (!tr) continue;
    await db.insert(categoryTranslations).values({
      categoryId: category.id,
      locale,
      name: tr.name,
      description: tr.description ?? "",
      seoTitle: tr.seoTitle ?? "",
      seoDescription: tr.seoDescription ?? "",
    });
  }

  await logAudit({ userId: guard.user.id, action: "admin.category.created", entityType: "category", entityId: category.id });
  return NextResponse.json({ category }, { status: 201 });
}
