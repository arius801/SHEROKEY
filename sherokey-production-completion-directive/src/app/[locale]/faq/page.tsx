import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listFaqs } from "@/lib/services/content";

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  const items = await listFaqs(locale);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg] sm:text-3xl">{ctx.dict.faqPage.title}</h1>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[--color-border] p-8 text-center text-sm text-[--color-muted]">
          {ctx.dict.search.noResults}
        </p>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([category, faqs]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[--color-primary]">
                {ctx.dict.faqPage.categories[category as keyof typeof ctx.dict.faqPage.categories] ?? category}
              </h2>
              <div className="divide-y divide-[--color-border] rounded-2xl border border-[--color-border] bg-[--color-card]">
                {faqs.map((f) => (
                  <details key={f.id} className="group p-5">
                    <summary className="cursor-pointer list-none font-semibold text-[--color-fg] marker:content-none">{f.question}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-[--color-muted]">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
