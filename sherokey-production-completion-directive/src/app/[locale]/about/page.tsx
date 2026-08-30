import { notFound } from "next/navigation";
import { Sparkles, ShieldCheck, Zap, Globe2, Users } from "lucide-react";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getStoreSettings } from "@/lib/services/settings";

const COPY: Record<string, { lead: string; mission: string }> = {
  en: {
    lead: "SHEROKEY is a digital products marketplace built for speed, trust and simplicity — software licenses, subscriptions, AI tools and gift cards delivered instantly, in the language and currency you prefer.",
    mission: "Our mission is to make buying legitimate digital products effortless: transparent pricing, verified inventory, real human support, and delivery you can rely on.",
  },
  ar: {
    lead: "شيروكي هو متجر رقمي مبني على السرعة والثقة والبساطة — تراخيص برمجية، اشتراكات، أدوات ذكاء اصطناعي وبطاقات هدايا تُسلَّم فورًا، باللغة والعملة التي تفضلها.",
    mission: "مهمتنا هي جعل شراء المنتجات الرقمية الأصلية أمرًا سهلاً: أسعار شفافة، مخزون موثوق، دعم بشري حقيقي، وتسليم يمكنك الاعتماد عليه.",
  },
  ru: {
    lead: "SHEROKEY — это цифровой маркетплейс, построенный на скорости, доверии и простоте: лицензии на ПО, подписки, ИИ-инструменты и подарочные карты доставляются мгновенно на удобном вам языке и в удобной валюте.",
    mission: "Наша миссия — сделать покупку легальных цифровых товаров максимально простой: прозрачные цены, проверенный склад, реальная поддержка и надёжная доставка.",
  },
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ctx = await getRequestContext(locale);
  const settings = await getStoreSettings();
  const copy = COPY[locale] ?? COPY.en;

  const values = [
    { icon: Zap, title: ctx.dict.home.whyInstant, desc: ctx.dict.home.whyInstantDesc },
    { icon: ShieldCheck, title: ctx.dict.home.whySecure, desc: ctx.dict.home.whySecureDesc },
    { icon: Sparkles, title: ctx.dict.home.whyVerified, desc: ctx.dict.home.whyVerifiedDesc },
    { icon: Globe2, title: ctx.dict.home.whyLanguages, desc: ctx.dict.home.whyLanguagesDesc },
    { icon: Users, title: ctx.dict.home.whySupport, desc: ctx.dict.home.whySupportDesc },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[--color-primary]">{ctx.dict.footer.about}</p>
      <h1 className="mb-5 text-3xl font-bold text-[--color-fg] sm:text-4xl">{settings.storeName}</h1>
      <p className="max-w-3xl text-lg leading-relaxed text-[--color-muted]">{copy.lead}</p>
      <p className="mt-4 max-w-3xl leading-relaxed text-[--color-muted]">{copy.mission}</p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {values.map((v) => (
          <div key={v.title} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
            <v.icon className="mb-3 h-6 w-6 text-[--color-primary]" />
            <h3 className="mb-1 font-bold text-[--color-fg]">{v.title}</h3>
            <p className="text-sm text-[--color-muted]">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
