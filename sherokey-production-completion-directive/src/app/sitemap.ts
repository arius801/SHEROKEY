import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LOCALES } from "@/lib/i18n/locales";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [];

  const staticPaths = ["", "/products", "/categories", "/deals", "/about", "/contact", "/faq", "/legal/terms-of-service", "/legal/privacy-policy", "/legal/refund-policy"];

  for (const locale of LOCALES) {
    for (const path of staticPaths) {
      entries.push({ url: `${base}/${locale}${path}`, changeFrequency: "daily", priority: path === "" ? 1 : 0.7 });
    }
  }

  const activeProducts = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "active"));
  for (const locale of LOCALES) {
    for (const p of activeProducts) {
      entries.push({ url: `${base}/${locale}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 });
    }
  }

  const activeCategories = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.status, "active"));
  for (const locale of LOCALES) {
    for (const c of activeCategories) {
      entries.push({ url: `${base}/${locale}/category/${c.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
  }

  return entries;
}
