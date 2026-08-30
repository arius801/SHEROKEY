import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { getRequestContext } from "@/lib/request-context";
import { getContentPage } from "@/lib/services/content";

const SLUG_MAP: Record<string, string> = {
  "terms-of-service": "terms-of-service",
  "privacy-policy": "privacy-policy",
  "refund-policy": "refund-policy",
  "cookie-policy": "cookie-policy",
  "digital-products-policy": "digital-products-policy",
  "acceptable-use-policy": "acceptable-use-policy",
};

const FALLBACK_TITLES: Record<string, { en: string; ar: string; ru: string }> = {
  "terms-of-service": { en: "Terms of Service", ar: "شروط الخدمة", ru: "Условия использования" },
  "privacy-policy": { en: "Privacy Policy", ar: "سياسة الخصوصية", ru: "Политика конфиденциальности" },
  "refund-policy": { en: "Refund Policy", ar: "سياسة الاسترجاع", ru: "Политика возврата" },
  "cookie-policy": { en: "Cookie Policy", ar: "سياسة ملفات تعريف الارتباط", ru: "Политика Cookies" },
};

const FALLBACK_BODY: Record<string, { en: string; ar: string; ru: string }> = {
  "terms-of-service": {
    en: "By using SHEROKEY you agree to purchase digital products for your own lawful use. License keys, subscriptions and account credentials are provided strictly according to the issuing vendor's terms. Reselling, sharing or circumventing vendor licensing restrictions is prohibited.",
    ar: "باستخدامك متجر شيروكي فإنك توافق على شراء المنتجات الرقمية للاستخدام الشخصي المشروع. يتم توفير مفاتيح التفعيل والاشتراكات وبيانات الحسابات وفقًا الصارم لشروط المزوّد الأصلي. يُمنع إعادة البيع أو المشاركة أو الالتفاف على قيود الترخيص.",
    ru: "Используя SHEROKEY, вы соглашаетесь приобретать цифровые товары исключительно для законного личного использования. Лицензионные ключи, подписки и учетные данные предоставляются строго в соответствии с условиями поставщика. Перепродажа, передача третьим лицам и обход ограничений лицензии запрещены.",
  },
  "privacy-policy": {
    en: "We collect only the information required to process your order, deliver digital products and provide support. Payment details are handled entirely by our PCI-compliant payment providers (Stripe/PayPal) — SHEROKEY never stores card numbers or CVV codes.",
    ar: "نقوم بجمع المعلومات اللازمة فقط لمعالجة طلبك وتسليم المنتجات الرقمية وتقديم الدعم. تتم معالجة بيانات الدفع بالكامل عبر مزودي الدفع المتوافقين مع معايير PCI (Stripe/PayPal) — لا يقوم شيروكي أبدًا بتخزين أرقام البطاقات أو رموز CVV.",
    ru: "Мы собираем только те данные, которые необходимы для обработки заказа, доставки цифровых товаров и оказания поддержки. Платёжные данные полностью обрабатываются нашими PCI-совместимыми провайдерами (Stripe/PayPal) — SHEROKEY никогда не хранит номера карт или коды CVV.",
  },
  "refund-policy": {
    en: "Because digital products are delivered instantly, refunds are evaluated case-by-case: unused/unrevealed license keys, duplicate charges, and failed activations (verifiable with the vendor) are eligible. Once a license key has been revealed or redeemed it cannot be refunded. Contact support with your order number to request a refund.",
    ar: "نظرًا لأن المنتجات الرقمية تُسلَّم فورًا، تتم مراجعة طلبات الاسترجاع لكل حالة على حدة: مفاتيح التفعيل غير المستخدمة/غير المكشوفة، والرسوم المكررة، وحالات فشل التفعيل (القابلة للتحقق مع المزوّد) مؤهلة للاسترجاع. بمجرد كشف المفتاح أو استخدامه لا يمكن استرجاعه. تواصل مع الدعم مع رقم طلبك لطلب الاسترجاع.",
    ru: "Поскольку цифровые товары доставляются мгновенно, возвраты рассматриваются индивидуально: неиспользованные/нераскрытые лицензионные ключи, дублирующиеся платежи и неудачные активации (подтверждаемые поставщиком) подлежат возврату. После раскрытия или использования ключа возврат невозможен. Свяжитесь с поддержкой, указав номер заказа, чтобы запросить возврат.",
  },
  "cookie-policy": {
    en: "SHEROKEY uses essential cookies for authentication sessions, cart contents, language and currency preferences. We do not use third-party advertising trackers.",
    ar: "يستخدم شيروكي ملفات تعريف ارتباط أساسية لجلسات تسجيل الدخول ومحتوى السلة وتفضيلات اللغة والعملة. لا نستخدم أدوات تتبع إعلانية من طرف ثالث.",
    ru: "SHEROKEY использует необходимые cookies для сессий авторизации, содержимого корзины, а также языковых и валютных настроек. Мы не используем сторонние рекламные трекеры.",
  },
};

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!SLUG_MAP[slug]) notFound();

  const ctx = await getRequestContext(locale);
  const stored = await getContentPage(slug, locale);

  const title = stored?.translation.title ?? FALLBACK_TITLES[slug]?.[locale] ?? ctx.dict.legal.terms;
  const body = stored?.translation.content ?? FALLBACK_BODY[slug]?.[locale] ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-[--color-fg] sm:text-3xl">{title}</h1>
      <div className="space-y-4 whitespace-pre-line rounded-2xl border border-[--color-border] bg-[--color-card] p-6 text-sm leading-relaxed text-[--color-muted] sm:p-8">
        {body || "This page is being finalized. Please contact support with any questions."}
      </div>
    </div>
  );
}
