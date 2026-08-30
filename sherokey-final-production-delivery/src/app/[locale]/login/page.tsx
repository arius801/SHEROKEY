import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { LoginForm } from "@/components/storefront/auth-forms";

export const revalidate = 0;

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (ctx.user) redirect(`/${locale}/account`);
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[--color-fg]">{dict.auth.login}</h1>
      <p className="mb-8 text-sm text-[--color-muted]">
        {dict.auth.dontHaveAccount}{" "}
        <Link href={`/${locale}/register`} className="font-semibold text-[--color-primary] hover:underline">
          {dict.auth.register}
        </Link>
      </p>
      <LoginForm
        locale={locale}
        labels={{
          email: dict.auth.email,
          password: dict.auth.password,
          signInCta: dict.auth.signInCta,
          invalidCredentials: dict.auth.invalidCredentials,
          accountDisabled: dict.errors.forbidden,
        }}
      />
      <Link href={`/${locale}/forgot-password`} className="mt-4 block text-center text-sm font-medium text-[--color-muted] hover:text-[--color-primary]">
        {dict.auth.forgotPassword}
      </Link>
    </div>
  );
}
