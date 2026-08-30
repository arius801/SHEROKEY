import "server-only";
import { db } from "@/db";
import { contentPages, contentPageTranslations, faqs, faqTranslations } from "@/db/schema";
import { and, asc, eq, or } from "drizzle-orm";
import type { Locale } from "@/lib/i18n/locales";
import { LOCALES } from "@/lib/i18n/locales";

export async function getContentPage(slug: string, locale: Locale) {
  const rows = await db.select().from(contentPages).where(and(eq(contentPages.slug, slug), eq(contentPages.status, "active"))).limit(1);
  const page = rows[0];
  if (!page) return null;
  const trRows = await db
    .select()
    .from(contentPageTranslations)
    .where(and(eq(contentPageTranslations.pageId, page.id), or(eq(contentPageTranslations.locale, locale), eq(contentPageTranslations.locale, "en"))));
  const tr = trRows.find((t) => t.locale === locale) ?? trRows.find((t) => t.locale === "en");
  if (!tr) return null;
  return { page, translation: tr };
}

export async function listContentPagesAdmin() {
  const rows = await db.select().from(contentPages).orderBy(asc(contentPages.slug));
  const items = [];
  for (const p of rows) {
    const translations = await db.select().from(contentPageTranslations).where(eq(contentPageTranslations.pageId, p.id));
    items.push({ ...p, translations });
  }
  return items;
}

export type ContentPageInput = {
  slug: string;
  status?: string;
  translations: { locale: string; title: string; content: string; seoTitle?: string; seoDescription?: string }[];
};

export async function upsertContentPage(id: number | null, input: ContentPageInput) {
  let pageId = id;
  if (pageId) {
    await db.update(contentPages).set({ slug: input.slug, status: input.status ?? "active", updatedAt: new Date() }).where(eq(contentPages.id, pageId));
  } else {
    const [created] = await db.insert(contentPages).values({ slug: input.slug, status: input.status ?? "active" }).returning();
    pageId = created.id;
  }
  for (const locale of LOCALES) {
    const tr = input.translations.find((t) => t.locale === locale);
    if (!tr) continue;
    const existing = await db
      .select()
      .from(contentPageTranslations)
      .where(and(eq(contentPageTranslations.pageId, pageId), eq(contentPageTranslations.locale, locale)))
      .limit(1);
    const values = { title: tr.title, content: tr.content, seoTitle: tr.seoTitle ?? "", seoDescription: tr.seoDescription ?? "" };
    if (existing[0]) {
      await db.update(contentPageTranslations).set(values).where(eq(contentPageTranslations.id, existing[0].id));
    } else {
      await db.insert(contentPageTranslations).values({ pageId, locale, ...values });
    }
  }
  return pageId;
}

export async function deleteContentPage(id: number) {
  await db.delete(contentPages).where(eq(contentPages.id, id));
}

// --- FAQs ---------------------------------------------------------------

export async function listFaqs(locale: Locale, category?: string) {
  const rows = await db
    .select()
    .from(faqs)
    .where(category ? and(eq(faqs.status, "active"), eq(faqs.category, category)) : eq(faqs.status, "active"))
    .orderBy(asc(faqs.sortOrder));
  const result = [];
  for (const f of rows) {
    const trRows = await db
      .select()
      .from(faqTranslations)
      .where(and(eq(faqTranslations.faqId, f.id), or(eq(faqTranslations.locale, locale), eq(faqTranslations.locale, "en"))));
    const tr = trRows.find((t) => t.locale === locale) ?? trRows.find((t) => t.locale === "en");
    if (!tr) continue;
    result.push({ id: f.id, category: f.category, question: tr.question, answer: tr.answer });
  }
  return result;
}

export async function listFaqsAdmin() {
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sortOrder));
  const items = [];
  for (const f of rows) {
    const translations = await db.select().from(faqTranslations).where(eq(faqTranslations.faqId, f.id));
    items.push({ ...f, translations });
  }
  return items;
}

export type FaqInput = {
  category: string;
  sortOrder?: number;
  status?: string;
  translations: { locale: string; question: string; answer: string }[];
};

export async function upsertFaq(id: number | null, input: FaqInput) {
  let faqId = id;
  if (faqId) {
    await db.update(faqs).set({ category: input.category, sortOrder: input.sortOrder ?? 0, status: input.status ?? "active" }).where(eq(faqs.id, faqId));
  } else {
    const [created] = await db.insert(faqs).values({ category: input.category, sortOrder: input.sortOrder ?? 0, status: input.status ?? "active" }).returning();
    faqId = created.id;
  }
  for (const locale of LOCALES) {
    const tr = input.translations.find((t) => t.locale === locale);
    if (!tr) continue;
    const existing = await db.select().from(faqTranslations).where(and(eq(faqTranslations.faqId, faqId), eq(faqTranslations.locale, locale))).limit(1);
    if (existing[0]) {
      await db.update(faqTranslations).set({ question: tr.question, answer: tr.answer }).where(eq(faqTranslations.id, existing[0].id));
    } else {
      await db.insert(faqTranslations).values({ faqId, locale, question: tr.question, answer: tr.answer });
    }
  }
  return faqId;
}

export async function deleteFaq(id: number) {
  await db.delete(faqs).where(eq(faqs.id, id));
}
