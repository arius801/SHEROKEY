import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { ForgotPasswordForm } from "@/components/storefront/auth-forms";

export const revalidate = 0;

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[--color-fg]">{dict.auth.forgotPassword}</h1>
      <p className="mb-8 text-sm text-[--color-muted]">{dict.auth.resetLinkSent}</p>
      <ForgotPasswordForm locale={locale} labels={{ email: dict.auth.email, sendResetLink: dict.auth.sendResetLink, resetLinkSent: dict.auth.resetLinkSent }} />
    </div>
  );
}
