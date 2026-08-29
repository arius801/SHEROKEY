import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { ResetPasswordForm } from "@/components/storefront/auth-forms";

export const revalidate = 0;

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { token } = await searchParams;
  const ctx = await getRequestContext(locale);
  const dict = ctx.dict;

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-[--color-muted]">{dict.errors.notFoundDesc}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-[--color-fg]">{dict.auth.resetPassword}</h1>
      <ResetPasswordForm
        locale={locale}
        token={token}
        labels={{
          password: dict.auth.password,
          confirmPassword: dict.auth.confirmPassword,
          resetPassword: dict.auth.resetPassword,
          weakPassword: dict.auth.weakPassword,
          invalidCredentials: dict.auth.invalidCredentials,
          passwordResetSuccess: dict.auth.passwordResetSuccess,
        }}
      />
    </div>
  );
}
