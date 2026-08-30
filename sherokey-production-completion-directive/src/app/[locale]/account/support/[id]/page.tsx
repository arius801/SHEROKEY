import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getTicketForCustomer } from "@/lib/services/support";
import { SupportChat } from "@/components/storefront/support-chat";

export const revalidate = 0;

export default async function AccountSupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale, id } = await params;
  const { email: emailParam } = await searchParams;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);

  const email = emailParam || ctx.user?.email || "";
  if (!ctx.user && !email) notFound();

  const result = await getTicketForCustomer(Number(id), { userId: ctx.user?.id ?? null, email });
  if (!result) notFound();
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/${locale}/account/support`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[--color-muted] hover:text-[--color-primary]">
        <ArrowLeft className="h-4 w-4" /> {dict.support.backToTickets}
      </Link>
      <SupportChat
        locale={locale}
        ticketId={result.ticket.id}
        email={email}
        subject={result.ticket.subject}
        status={result.ticket.status}
        initialReplies={[
          { id: -1, authorRole: "customer", authorName: result.ticket.name || "You", message: result.ticket.message, createdAt: String(result.ticket.createdAt) },
          ...result.replies.map((r) => ({ id: r.id, authorRole: r.authorRole, authorName: r.authorName, message: r.message, createdAt: String(r.createdAt) })),
        ]}
        labels={{
          backToTickets: dict.support.backToTickets,
          replyPlaceholder: dict.support.replyPlaceholder,
          sendReply: dict.support.sendReply,
          genericError: dict.errors.genericError,
          ticketStatuses: dict.support.ticketStatuses,
        }}
      />
    </div>
  );
}
