import Link from "next/link";
import { Sparkles, Globe, MessageCircle, Send, AtSign } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export function Footer({ locale, dict }: { locale: string; dict: Dictionary }) {
  return (
    <footer className="border-t border-[--color-border] bg-[--color-card]/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href={`/${locale}`} className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-lg text-[--color-fg]">SHEROKEY</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[--color-muted]">{dict.footer.brandDesc}</p>
          <div className="mt-5 flex gap-2">
            {[Globe, MessageCircle, AtSign, Send].map((Icon, i) => (
              <span key={i} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] text-[--color-muted]">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-[--color-fg]">{dict.footer.shop}</h4>
          <ul className="space-y-2 text-sm text-[--color-muted]">
            <li><Link href={`/${locale}/products`} className="hover:text-[--color-primary]">{dict.footer.allProducts}</Link></li>
            <li><Link href={`/${locale}/products?sort=popular`} className="hover:text-[--color-primary]">{dict.footer.bestSellers}</Link></li>
            <li><Link href={`/${locale}/deals`} className="hover:text-[--color-primary]">{dict.footer.deals}</Link></li>
            <li><Link href={`/${locale}/products?sort=newest`} className="hover:text-[--color-primary]">{dict.footer.newArrivals}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-[--color-fg]">{dict.footer.support}</h4>
          <ul className="space-y-2 text-sm text-[--color-muted]">
            <li><Link href={`/${locale}/contact`} className="hover:text-[--color-primary]">{dict.footer.contact}</Link></li>
            <li><Link href={`/${locale}/faq`} className="hover:text-[--color-primary]">{dict.footer.faq}</Link></li>
            <li><Link href={`/${locale}/account/orders`} className="hover:text-[--color-primary]">{dict.footer.orders}</Link></li>
            <li><Link href={`/${locale}/legal/refund-policy`} className="hover:text-[--color-primary]">{dict.footer.refundPolicy}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-[--color-fg]">{dict.footer.company}</h4>
          <ul className="space-y-2 text-sm text-[--color-muted]">
            <li><Link href={`/${locale}/about`} className="hover:text-[--color-primary]">{dict.footer.about}</Link></li>
            <li><Link href={`/${locale}/legal/terms-of-service`} className="hover:text-[--color-primary]">{dict.footer.terms}</Link></li>
            <li><Link href={`/${locale}/legal/privacy-policy`} className="hover:text-[--color-primary]">{dict.footer.privacy}</Link></li>
            <li><Link href={`/${locale}/legal/cookie-policy`} className="hover:text-[--color-primary]">{dict.footer.cookies}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[--color-border] px-4 py-5 text-center text-xs text-[--color-muted] sm:px-6">
        {dict.footer.rights}
      </div>
    </footer>
  );
}
