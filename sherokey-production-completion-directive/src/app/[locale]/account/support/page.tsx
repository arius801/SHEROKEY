import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LifeBuoy, Plus } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { listTicketsForCustomer } from "@/lib/services/support";
import { AccountShell } from "@/components/storefront/account-shell";

export const revalidate = 0;

export default async function AccountSupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (!ctx.user) redirect(`/${locale}/login?redirect=/${locale}/account/support`);
  const dict = ctx.dict;

  const tickets = await listTicketsForCustomer({ userId: ctx.user.id, email: ctx.user.email });

  return (
    <AccountShell locale={locale} dict={dict} active="support">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[--color-fg]">{dict.support.myTickets}</h1>
        <Link
          href={`/${locale}/contact`}
          className="flex items-center gap-1.5 rounded-xl bg-[--color-primary] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {dict.support.newTicket}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[--color-border] py-16 text-center">
          <LifeBuoy className="mb-3 h-9 w-9 text-[--color-muted]" />
          <p className="font-semibold text-[--color-fg]">{dict.support.noTickets}</p>
          <p className="text-sm text-[--color-muted]">{dict.support.noTicketsDesc}</p>
        </div>
      ) : (
        <div className="divide-y divide-[--color-border] rounded-2xl border border-[--color-border] bg-[--color-card]">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/${locale}/account/support/${t.id}?email=${encodeURIComponent(ctx.user!.email)}`}
              className="flex items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-[--color-primary]/5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[--color-fg]">{t.subject}</p>
                <p className="text-xs text-[--color-muted]">#{t.id} · {new Date(t.lastMessageAt).toLocaleString(locale)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t.unreadForCustomer && <span className="h-2 w-2 rounded-full bg-[--color-primary]" />}
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${
                    t.status === "closed"
                      ? "border-slate-500/30 bg-slate-500/10 text-slate-400"
                      : t.status === "answered"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {dict.support.ticketStatuses[t.status as keyof typeof dict.support.ticketStatuses] ?? t.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
