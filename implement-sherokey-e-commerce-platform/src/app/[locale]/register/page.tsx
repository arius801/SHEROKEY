import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { RegisterForm } from "@/components/storefront/auth-forms";

export const revalidate = 0;

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (ctx.user) redirect(`/${locale}/account`);
  const dict = ctx.dict;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[--color-fg]">{dict.auth.register}</h1>
      <p className="mb-8 text-sm text-[--color-muted]">
        {dict.auth.alreadyHaveAccount}{" "}
        <Link href={`/${locale}/login`} className="font-semibold text-[--color-primary] hover:underline">
          {dict.auth.login}
        </Link>
      </p>
      <RegisterForm
        locale={locale}
        labels={{
          firstName: dict.auth.firstName,
          lastName: dict.auth.lastName,
          email: dict.auth.email,
          password: dict.auth.password,
          confirmPassword: dict.auth.confirmPassword,
          registerCta: dict.auth.registerCta,
          emailInUse: dict.auth.emailInUse,
          weakPassword: dict.auth.weakPassword,
        }}
      />
    </div>
  );
}
