import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { AccountShell } from "@/components/storefront/account-shell";
import { ProfileForm } from "@/components/storefront/profile-form";

export const revalidate = 0;

export default async function AccountProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  if (!ctx.user) redirect(`/${locale}/login?redirect=/${locale}/account/profile`);
  const dict = ctx.dict;

  return (
    <AccountShell locale={locale} dict={dict} active="profile">
      <h1 className="mb-6 text-xl font-bold text-[--color-fg]">{dict.account.profile}</h1>
      <ProfileForm
        locale={locale}
        user={{ firstName: ctx.user.firstName, lastName: ctx.user.lastName, email: ctx.user.email }}
        labels={{
          accountInfo: dict.account.accountInfo,
          firstName: dict.auth.firstName,
          lastName: dict.auth.lastName,
          email: dict.auth.email,
          saveChanges: dict.account.saveChanges,
          updated: dict.account.updated,
          changePassword: dict.account.changePassword,
          currentPassword: dict.account.currentPassword,
          newPassword: dict.account.newPassword,
          confirmPassword: dict.account.confirmPassword,
          genericError: dict.errors.genericError,
        }}
      />
    </AccountShell>
  );
}
