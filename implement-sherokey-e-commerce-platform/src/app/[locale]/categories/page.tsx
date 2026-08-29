import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listCategories } from "@/lib/services/categories";
import { CATEGORY_ICONS } from "@/components/storefront/category-icon";

export const revalidate = 0;

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const ctx = await getRequestContext(locale);
  const categories = await listCategories(locale);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg] sm:text-3xl">{ctx.dict.nav.categories}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon ?? ""] ?? Sparkles;
          return (
            <Link
              key={cat.id}
              href={`/${locale}/category/${cat.slug}`}
              className="group flex flex-col gap-3 rounded-2xl border border-[--color-border] bg-[--color-card] p-6 transition hover:-translate-y-1 hover:border-[--color-primary]/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-primary]/10 text-[--color-primary] transition group-hover:bg-[--color-primary] group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-bold text-[--color-fg]">{cat.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[--color-muted]">{cat.description}</p>
                <p className="mt-2 text-xs font-semibold text-[--color-primary]">{cat.productCount} items</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
