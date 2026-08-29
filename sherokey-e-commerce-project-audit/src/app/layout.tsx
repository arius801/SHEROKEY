import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { isLocale, DEFAULT_LOCALE, dirFor } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: "SHEROKEY — Digital Products, Licenses & Subscriptions",
  description: "Digital Products. Instant Delivery. Trusted by Everyone.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("shk_locale")?.value;
  const themeCookie = cookieStore.get("shk_theme")?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const dir = dirFor(locale);
  const theme = themeCookie === "light" ? "light" : "dark";

  return (
    <html lang={locale} dir={dir} className={theme} suppressHydrationWarning>
      <body className="min-h-screen bg-[--color-bg] text-[--color-fg] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
