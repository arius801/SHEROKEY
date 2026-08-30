import { notFound } from "next/navigation";
import { Mail, Clock, Send, Building2 } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getStoreSettings } from "@/lib/services/settings";
import { SupportTicketForm } from "@/components/storefront/support-ticket-form";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  const settings = await getStoreSettings();
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-[--color-fg] sm:text-3xl">{dict.support.title}</h1>
      <p className="mb-10 max-w-2xl text-[--color-muted]">{dict.support.subtitle}</p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <InfoCard icon={Mail} title={dict.checkout.email} value={settings.supportEmail || settings.contactEmail} href={`mailto:${settings.supportEmail || settings.contactEmail}`} />
          {settings.social.telegram && (
            <InfoCard icon={Send} title="Telegram" value={settings.social.telegram} href={`https://t.me/${settings.social.telegram.replace("@", "")}`} />
          )}
          <InfoCard icon={Building2} title={dict.footer.company} value={settings.storeName} />
          <InfoCard icon={Clock} title={dict.support.subtitle.split(".")[0]} value="24/7" />
        </div>

        <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6 lg:col-span-2 sm:p-8">
          <SupportTicketForm
            locale={locale}
            defaultEmail={ctx.user?.email ?? ""}
            defaultName={ctx.user ? `${ctx.user.firstName} ${ctx.user.lastName}`.trim() : ""}
            labels={{
              name: dict.support.name,
              email: dict.support.email,
              orderNumber: dict.support.orderNumber,
              category: dict.support.category,
              subject: dict.support.subject,
              message: dict.support.message,
              send: dict.support.send,
              sent: dict.support.sent,
              categories: dict.support.categories,
              genericError: dict.errors.genericError,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, href }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-2xl border border-[--color-border] bg-[--color-card] p-5">
      <Icon className="mb-2 h-5 w-5 text-[--color-primary]" />
      <p className="text-xs text-[--color-muted]">{title}</p>
      <p className="font-semibold text-[--color-fg]">{value}</p>
    </div>
  );
  return href ? (
    <a href={href} className="block transition hover:opacity-80">
      {content}
    </a>
  ) : (
    content
  );
}
