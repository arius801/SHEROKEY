import "dotenv/config";
import { db, pool } from "@/db";
import {
  languages,
  currencies,
  settings,
  users,
  categories,
  categoryTranslations,
  products,
  productTranslations,
  productVariants,
  productVariantTranslations,
  licenseKeys,
  coupons,
  faqs,
  faqTranslations,
  contentPages,
  contentPageTranslations,
  announcements,
  banners,
  reviews,
} from "@/db/schema";
import { hashPassword, encryptSecret } from "@/lib/crypto";
import { eq } from "drizzle-orm";

async function upsertLanguage(code: string, name: string, nativeName: string, direction: "ltr" | "rtl", isDefault: boolean, sortOrder: number) {
  const existing = await db.select().from(languages).where(eq(languages.code, code)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(languages).values({ code, name, nativeName, direction, isDefault, sortOrder }).returning();
  return row;
}

async function upsertCurrency(code: string, name: string, symbol: string, exchangeRate: string, decimals: number, isDefault: boolean, symbolPosition: "before" | "after") {
  const existing = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(currencies).values({ code, name, symbol, exchangeRate, decimals, isDefault, symbolPosition }).returning();
  return row;
}

async function upsertCategory(slug: string, icon: string, sortOrder: number, translations: Record<string, { name: string; description: string }>) {
  let cat = (await db.select().from(categories).where(eq(categories.slug, slug)).limit(1))[0];
  if (!cat) {
    [cat] = await db.insert(categories).values({ slug, icon, sortOrder }).returning();
  }
  for (const [locale, tr] of Object.entries(translations)) {
    const existing = await db
      .select()
      .from(categoryTranslations)
      .where(eq(categoryTranslations.categoryId, cat.id));
    const found = existing.find((e) => e.locale === locale);
    if (!found) {
      await db.insert(categoryTranslations).values({ categoryId: cat.id, locale, name: tr.name, description: tr.description });
    }
  }
  return cat;
}

type ProductSeed = {
  slug: string;
  sku: string;
  brand: string;
  categorySlug: string;
  productType: string;
  stockMode: "unlimited" | "quantity" | "license_key";
  basePriceMinor: number;
  comparePriceMinor?: number;
  featured?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  rating: string;
  reviewCount: number;
  image: string;
  translations: Record<string, { name: string; short: string; desc: string; features: string[]; whatsIncluded: string[]; activation: string }>;
  variants: { sku: string; duration: string; priceMinor: number; comparePriceMinor?: number; stock: number; names: Record<string, string> }[];
  keysPerVariant?: number;
};

async function upsertProduct(p: ProductSeed) {
  let prod = (await db.select().from(products).where(eq(products.slug, p.slug)).limit(1))[0];
  const cat = (await db.select().from(categories).where(eq(categories.slug, p.categorySlug)).limit(1))[0];
  if (!prod) {
    [prod] = await db
      .insert(products)
      .values({
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        categoryId: cat?.id,
        productType: p.productType,
        stockMode: p.stockMode,
        basePriceMinor: p.basePriceMinor,
        comparePriceMinor: p.comparePriceMinor,
        featured: !!p.featured,
        bestseller: !!p.bestseller,
        isNew: !!p.isNew,
        rating: p.rating,
        reviewCount: p.reviewCount,
        image: p.image,
        status: "active",
      })
      .returning();
  }

  for (const [locale, tr] of Object.entries(p.translations)) {
    const existing = await db.select().from(productTranslations).where(eq(productTranslations.productId, prod.id));
    const found = existing.find((e) => e.locale === locale);
    if (!found) {
      await db.insert(productTranslations).values({
        productId: prod.id,
        locale,
        name: tr.name,
        shortDescription: tr.short,
        description: tr.desc,
        features: tr.features,
        whatsIncluded: tr.whatsIncluded,
        activationInstructions: tr.activation,
        faq: [],
      });
    }
  }

  let totalStock = 0;
  for (const [idx, v] of p.variants.entries()) {
    let variant = (await db.select().from(productVariants).where(eq(productVariants.sku, v.sku)).limit(1))[0];
    if (!variant) {
      [variant] = await db
        .insert(productVariants)
        .values({
          productId: prod.id,
          sku: v.sku,
          duration: v.duration,
          priceMinor: v.priceMinor,
          comparePriceMinor: v.comparePriceMinor,
          stock: v.stock,
          sortOrder: idx,
        })
        .returning();
    }
    for (const [locale, name] of Object.entries(v.names)) {
      const existing = await db.select().from(productVariantTranslations).where(eq(productVariantTranslations.variantId, variant.id));
      const found = existing.find((e) => e.locale === locale);
      if (!found) {
        await db.insert(productVariantTranslations).values({ variantId: variant.id, locale, name });
      }
    }

    if (p.stockMode === "license_key" && p.keysPerVariant) {
      const existingKeys = await db.select().from(licenseKeys).where(eq(licenseKeys.variantId, variant.id));
      const need = p.keysPerVariant - existingKeys.length;
      for (let i = 0; i < need; i++) {
        const rawKey = `${p.sku}-${v.sku}-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        await db.insert(licenseKeys).values({
          productId: prod.id,
          variantId: variant.id,
          encryptedKey: encryptSecret(rawKey),
          status: "available",
        });
      }
      totalStock += p.keysPerVariant;
    }
  }

  if (p.stockMode === "quantity") {
    totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  if (p.stockMode !== "unlimited") {
    await db.update(products).set({ stockQuantity: totalStock }).where(eq(products.id, prod.id));
  }

  return prod;
}

async function main() {
  console.log("Seeding SHEROKEY database...");

  // Languages
  await upsertLanguage("en", "English", "English", "ltr", true, 0);
  await upsertLanguage("ar", "Arabic", "العربية", "rtl", false, 1);
  await upsertLanguage("ru", "Russian", "Русский", "ltr", false, 2);

  // Currencies
  await upsertCurrency("USD", "US Dollar", "$", "1", 2, true, "before");
  await upsertCurrency("SAR", "Saudi Riyal", "ر.س", "3.75", 2, false, "after");
  await upsertCurrency("RUB", "Russian Ruble", "₽", "95", 2, false, "after");

  // Store settings
  const existingSettings = await db.select().from(settings).where(eq(settings.key, "store")).limit(1);
  if (!existingSettings[0]) {
    await db.insert(settings).values({
      key: "store",
      value: {
        storeName: "SHEROKEY",
        storeDescription: "Digital Products. Instant Delivery. Trusted by Everyone.",
        contactEmail: process.env.SMTP_FROM_EMAIL || "hello@sherokey.com",
        supportEmail: "support@sherokey.com",
        phone: "+1 (555) 200-3000",
        social: { twitter: "https://twitter.com/sherokey", instagram: "https://instagram.com/sherokey", facebook: "", telegram: "https://t.me/sherokey" },
        guestCheckout: true,
        maintenanceMode: false,
        minOrderMinor: 0,
        taxRatePercent: 0,
        paymentProviders: { stripe: false, paypal: false, bank_transfer: true, sandbox: true },
      },
    });
  }

  // Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@sherokey.com").toLowerCase();
  const adminExisting = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (!adminExisting[0]) {
    const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "ChangeMe123!");
    await db.insert(users).values({
      email: adminEmail,
      passwordHash,
      firstName: "SHEROKEY",
      lastName: "Admin",
      role: "admin",
      status: "active",
      emailVerified: true,
      locale: "en",
      currency: "USD",
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  // Demo customer
  const demoEmail = "customer@sherokey.com";
  const demoExisting = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
  let demoUser = demoExisting[0];
  if (!demoUser) {
    const passwordHash = await hashPassword("Password123!");
    const [row] = await db
      .insert(users)
      .values({ email: demoEmail, passwordHash, firstName: "Alex", lastName: "Customer", role: "customer", status: "active", emailVerified: true })
      .returning();
    demoUser = row;
    console.log(`Demo customer created: ${demoEmail} / Password123!`);
  }

  // Categories
  await upsertCategory("ai-productivity", "bot", 0, {
    en: { name: "AI & Productivity", description: "AI tools and productivity software" },
    ar: { name: "الذكاء الاصطناعي والإنتاجية", description: "أدوات الذكاء الاصطناعي وبرامج الإنتاجية" },
    ru: { name: "ИИ и продуктивность", description: "Инструменты ИИ и программы для продуктивности" },
  });
  await upsertCategory("microsoft", "windows", 1, {
    en: { name: "Microsoft & OS", description: "Windows, Office and operating systems" },
    ar: { name: "مايكروسوفت وأنظمة التشغيل", description: "ويندوز وأوفيس وأنظمة التشغيل" },
    ru: { name: "Microsoft и ОС", description: "Windows, Office и операционные системы" },
  });
  await upsertCategory("security", "shield", 2, {
    en: { name: "Security & VPN", description: "Antivirus, VPN and online security" },
    ar: { name: "الأمان والشبكات الافتراضية", description: "مضاد الفيروسات وشبكات VPN والأمان" },
    ru: { name: "Безопасность и VPN", description: "Антивирусы, VPN и онлайн-безопасность" },
  });
  await upsertCategory("design", "palette", 3, {
    en: { name: "Design & Creative", description: "Design and creative software" },
    ar: { name: "التصميم والإبداع", description: "برامج التصميم والإبداع" },
    ru: { name: "Дизайн и творчество", description: "Программы для дизайна и творчества" },
  });
  await upsertCategory("developer", "code", 4, {
    en: { name: "Developer Tools", description: "IDEs, dev tools and cloud services" },
    ar: { name: "أدوات المطورين", description: "بيئات التطوير والأدوات السحابية" },
    ru: { name: "Инструменты разработчика", description: "IDE, инструменты и облачные сервисы" },
  });
  await upsertCategory("gaming", "gamepad", 5, {
    en: { name: "Gaming", description: "Game keys and gaming subscriptions" },
    ar: { name: "الألعاب", description: "مفاتيح الألعاب والاشتراكات" },
    ru: { name: "Игры", description: "Ключи игр и игровые подписки" },
  });
  await upsertCategory("streaming", "film", 6, {
    en: { name: "Streaming & Media", description: "Streaming and media subscriptions" },
    ar: { name: "البث والوسائط", description: "اشتراكات البث والوسائط" },
    ru: { name: "Стриминг и медиа", description: "Стриминговые и медиа подписки" },
  });
  await upsertCategory("gift-cards", "gift", 7, {
    en: { name: "Gift Cards", description: "Digital gift cards" },
    ar: { name: "بطاقات الهدايا", description: "بطاقات الهدايا الرقمية" },
    ru: { name: "Подарочные карты", description: "Цифровые подарочные карты" },
  });

  // Products
  await upsertProduct({
    slug: "chatgpt-plus-subscription",
    sku: "SHK-AI-001",
    brand: "OpenAI",
    categorySlug: "ai-productivity",
    productType: "subscription",
    stockMode: "unlimited",
    basePriceMinor: 2000,
    comparePriceMinor: 2500,
    featured: true,
    bestseller: true,
    rating: "4.80",
    reviewCount: 214,
    image: "",
    translations: {
      en: {
        name: "ChatGPT Plus Subscription",
        short: "Priority access to GPT-4o, faster responses and new features.",
        desc: "ChatGPT Plus gives you priority access to the latest OpenAI models, faster response times, and early access to new features. Perfect for professionals, students and creators who rely on AI daily.",
        features: ["Access to GPT-4o", "Faster response speed", "Priority access during peak times", "Access to new features first"],
        whatsIncluded: ["1 month subscription code", "Activation instructions", "Email support"],
        activation: "Redeem the code in your OpenAI account settings under Billing > Redeem Code.",
      },
      ar: {
        name: "اشتراك ChatGPT Plus",
        short: "وصول ذو أولوية إلى GPT-4o مع استجابة أسرع وميزات جديدة.",
        desc: "يمنحك اشتراك ChatGPT Plus وصولاً ذا أولوية لأحدث نماذج OpenAI، واستجابة أسرع، ووصولاً مبكرًا للميزات الجديدة.",
        features: ["الوصول إلى GPT-4o", "استجابة أسرع", "أولوية الوصول في أوقات الذروة", "وصول مبكر للميزات الجديدة"],
        whatsIncluded: ["رمز اشتراك لمدة شهر", "تعليمات التفعيل", "دعم عبر البريد الإلكتروني"],
        activation: "قم بتفعيل الرمز من إعدادات حساب OpenAI ضمن الفوترة > استرداد الرمز.",
      },
      ru: {
        name: "Подписка ChatGPT Plus",
        short: "Приоритетный доступ к GPT-4o, более быстрые ответы и новые функции.",
        desc: "ChatGPT Plus предоставляет приоритетный доступ к новейшим моделям OpenAI, более быстрые ответы и ранний доступ к новым функциям.",
        features: ["Доступ к GPT-4o", "Более быстрый отклик", "Приоритет в часы пик", "Ранний доступ к новым функциям"],
        whatsIncluded: ["Код подписки на 1 месяц", "Инструкция по активации", "Поддержка по email"],
        activation: "Активируйте код в настройках аккаунта OpenAI в разделе Billing > Redeem Code.",
      },
    },
    variants: [
      { sku: "SHK-AI-001-1M", duration: "1 month", priceMinor: 2000, comparePriceMinor: 2500, stock: 0, names: { en: "1 Month", ar: "شهر واحد", ru: "1 месяц" } },
      { sku: "SHK-AI-001-3M", duration: "3 months", priceMinor: 5400, comparePriceMinor: 7500, stock: 0, names: { en: "3 Months", ar: "3 أشهر", ru: "3 месяца" } },
    ],
  });

  await upsertProduct({
    slug: "windows-11-pro-license",
    sku: "SHK-MS-001",
    brand: "Microsoft",
    categorySlug: "microsoft",
    productType: "license_key",
    stockMode: "license_key",
    basePriceMinor: 2999,
    comparePriceMinor: 19999,
    featured: true,
    bestseller: true,
    rating: "4.70",
    reviewCount: 1893,
    image: "",
    translations: {
      en: {
        name: "Windows 11 Pro License Key",
        short: "Genuine lifetime activation key for Windows 11 Pro, delivered instantly.",
        desc: "Get a genuine, lifetime Windows 11 Pro license key delivered instantly to your email. Works on new installs and upgrades from Windows 10/11.",
        features: ["Lifetime activation", "Genuine Microsoft key", "1 PC license", "Digital delivery in minutes"],
        whatsIncluded: ["License key", "Step-by-step activation guide", "Free customer support"],
        activation: "Go to Settings > System > Activation > Change product key, then paste your key.",
      },
      ar: {
        name: "مفتاح ترخيص ويندوز 11 برو",
        short: "مفتاح تفعيل أصلي مدى الحياة لويندوز 11 برو، يصلك فورًا.",
        desc: "احصل على مفتاح ترخيص أصلي مدى الحياة لويندوز 11 برو يصلك فورًا عبر البريد الإلكتروني.",
        features: ["تفعيل مدى الحياة", "مفتاح مايكروسوفت أصلي", "ترخيص لجهاز واحد", "تسليم رقمي خلال دقائق"],
        whatsIncluded: ["مفتاح الترخيص", "دليل تفعيل خطوة بخطوة", "دعم فني مجاني"],
        activation: "اذهب إلى الإعدادات > النظام > التفعيل > تغيير مفتاح المنتج، ثم الصق المفتاح.",
      },
      ru: {
        name: "Ключ Windows 11 Pro",
        short: "Официальный бессрочный ключ активации Windows 11 Pro, мгновенная доставка.",
        desc: "Получите официальный бессрочный ключ Windows 11 Pro, который придёт мгновенно на почту.",
        features: ["Бессрочная активация", "Официальный ключ Microsoft", "Лицензия на 1 ПК", "Доставка за минуты"],
        whatsIncluded: ["Ключ лицензии", "Пошаговая инструкция", "Бесплатная поддержка"],
        activation: "Перейдите в Параметры > Система > Активация > Изменить ключ продукта и вставьте ключ.",
      },
    },
    variants: [{ sku: "SHK-MS-001-STD", duration: "lifetime", priceMinor: 2999, comparePriceMinor: 19999, stock: 0, names: { en: "Lifetime / 1 PC", ar: "مدى الحياة / جهاز واحد", ru: "Бессрочно / 1 ПК" } }],
    keysPerVariant: 25,
  });

  await upsertProduct({
    slug: "office-2021-professional-plus",
    sku: "SHK-MS-002",
    brand: "Microsoft",
    categorySlug: "microsoft",
    productType: "license_key",
    stockMode: "license_key",
    basePriceMinor: 3499,
    comparePriceMinor: 21999,
    bestseller: true,
    rating: "4.60",
    reviewCount: 967,
    image: "",
    translations: {
      en: {
        name: "Office 2021 Professional Plus",
        short: "Lifetime license for Word, Excel, PowerPoint, Outlook and more.",
        desc: "Office 2021 Professional Plus includes Word, Excel, PowerPoint, Outlook, Access and Publisher with a lifetime license for one PC.",
        features: ["Lifetime license", "Word, Excel, PowerPoint, Outlook", "1 PC activation", "Instant email delivery"],
        whatsIncluded: ["License key", "Download link", "Activation guide"],
        activation: "Download Office from the official site and activate using your key during setup.",
      },
      ar: {
        name: "أوفيس 2021 بروفيشنال بلس",
        short: "ترخيص مدى الحياة لبرامج وورد وإكسل وبوربوينت وأوتلوك.",
        desc: "يشمل أوفيس 2021 بروفيشنال بلس برامج وورد وإكسل وبوربوينت وأوتلوك وأكسس وبَبلشر بترخيص مدى الحياة لجهاز واحد.",
        features: ["ترخيص مدى الحياة", "وورد وإكسل وبوربوينت وأوتلوك", "تفعيل لجهاز واحد", "تسليم فوري عبر البريد"],
        whatsIncluded: ["مفتاح الترخيص", "رابط التحميل", "دليل التفعيل"],
        activation: "قم بتحميل أوفيس من الموقع الرسمي وفعّله باستخدام المفتاح أثناء التثبيت.",
      },
      ru: {
        name: "Office 2021 Professional Plus",
        short: "Бессрочная лицензия на Word, Excel, PowerPoint, Outlook и другое.",
        desc: "Office 2021 Professional Plus включает Word, Excel, PowerPoint, Outlook, Access и Publisher с бессрочной лицензией на 1 ПК.",
        features: ["Бессрочная лицензия", "Word, Excel, PowerPoint, Outlook", "Активация на 1 ПК", "Мгновенная доставка"],
        whatsIncluded: ["Ключ лицензии", "Ссылка на загрузку", "Инструкция по активации"],
        activation: "Скачайте Office с официального сайта и активируйте с помощью ключа при установке.",
      },
    },
    variants: [{ sku: "SHK-MS-002-STD", duration: "lifetime", priceMinor: 3499, comparePriceMinor: 21999, stock: 0, names: { en: "Lifetime / 1 PC", ar: "مدى الحياة / جهاز واحد", ru: "Бессрочно / 1 ПК" } }],
    keysPerVariant: 20,
  });

  await upsertProduct({
    slug: "nordvpn-subscription",
    sku: "SHK-SEC-001",
    brand: "NordVPN",
    categorySlug: "security",
    productType: "subscription",
    stockMode: "unlimited",
    basePriceMinor: 3999,
    comparePriceMinor: 9999,
    isNew: true,
    rating: "4.75",
    reviewCount: 542,
    image: "",
    translations: {
      en: {
        name: "NordVPN Subscription",
        short: "Secure, fast VPN with servers in 60+ countries.",
        desc: "NordVPN keeps your connection private and secure with military-grade encryption, servers in 60+ countries and support for up to 6 devices.",
        features: ["6 devices at once", "60+ countries", "No-logs policy", "Kill switch & threat protection"],
        whatsIncluded: ["Subscription activation code", "Setup guide for all platforms"],
        activation: "Sign in to your NordVPN account and enter the code under Billing > Redeem gift card.",
      },
      ar: {
        name: "اشتراك NordVPN",
        short: "شبكة VPN آمنة وسريعة بخوادم في أكثر من 60 دولة.",
        desc: "يحافظ NordVPN على خصوصية اتصالك وأمانه بتشفير عسكري المستوى، وخوادم في أكثر من 60 دولة، ودعم حتى 6 أجهزة.",
        features: ["6 أجهزة في وقت واحد", "أكثر من 60 دولة", "سياسة عدم الاحتفاظ بالسجلات", "مفتاح إيقاف وحماية من التهديدات"],
        whatsIncluded: ["رمز تفعيل الاشتراك", "دليل الإعداد لجميع الأنظمة"],
        activation: "سجل الدخول إلى حساب NordVPN وأدخل الرمز ضمن الفوترة > استرداد بطاقة هدية.",
      },
      ru: {
        name: "Подписка NordVPN",
        short: "Быстрый и безопасный VPN с серверами в 60+ странах.",
        desc: "NordVPN обеспечивает конфиденциальность соединения с шифрованием военного уровня, серверами в 60+ странах и поддержкой до 6 устройств.",
        features: ["6 устройств одновременно", "60+ стран", "Политика отсутствия логов", "Kill switch и защита от угроз"],
        whatsIncluded: ["Код активации подписки", "Инструкция для всех платформ"],
        activation: "Войдите в аккаунт NordVPN и введите код в разделе Billing > Redeem gift card.",
      },
    },
    variants: [
      { sku: "SHK-SEC-001-1Y", duration: "1 year", priceMinor: 3999, comparePriceMinor: 9999, stock: 0, names: { en: "1 Year", ar: "سنة واحدة", ru: "1 год" } },
      { sku: "SHK-SEC-001-2Y", duration: "2 years", priceMinor: 6999, comparePriceMinor: 17999, stock: 0, names: { en: "2 Years", ar: "سنتان", ru: "2 года" } },
    ],
  });

  await upsertProduct({
    slug: "adobe-creative-cloud",
    sku: "SHK-DES-001",
    brand: "Adobe",
    categorySlug: "design",
    productType: "subscription",
    stockMode: "unlimited",
    basePriceMinor: 4999,
    comparePriceMinor: 6999,
    featured: true,
    rating: "4.65",
    reviewCount: 331,
    image: "",
    translations: {
      en: {
        name: "Adobe Creative Cloud (All Apps)",
        short: "Photoshop, Illustrator, Premiere Pro and 20+ creative apps.",
        desc: "Get the full Adobe Creative Cloud suite including Photoshop, Illustrator, Premiere Pro, After Effects and more — all in one subscription.",
        features: ["20+ creative apps", "100GB cloud storage", "Adobe Fonts included", "Regular feature updates"],
        whatsIncluded: ["Subscription activation", "Setup guide"],
        activation: "Sign in with the provided Adobe ID or redeem the code in your existing account.",
      },
      ar: {
        name: "أدوبي كرييتف كلاود (جميع التطبيقات)",
        short: "فوتوشوب وإليستريتور وبريمير برو و20+ تطبيقًا إبداعيًا.",
        desc: "احصل على مجموعة أدوبي كرييتف كلاود الكاملة تشمل فوتوشوب وإليستريتور وبريمير برو وأفتر إفكتس وغيرها.",
        features: ["أكثر من 20 تطبيقًا إبداعيًا", "100 جيجابايت تخزين سحابي", "خطوط أدوبي مشمولة", "تحديثات دورية"],
        whatsIncluded: ["تفعيل الاشتراك", "دليل الإعداد"],
        activation: "سجّل الدخول بمعرف أدوبي المرفق أو فعّل الرمز في حسابك الحالي.",
      },
      ru: {
        name: "Adobe Creative Cloud (все приложения)",
        short: "Photoshop, Illustrator, Premiere Pro и 20+ приложений.",
        desc: "Получите полный набор Adobe Creative Cloud, включая Photoshop, Illustrator, Premiere Pro, After Effects и другие.",
        features: ["20+ творческих приложений", "100 ГБ облачного хранилища", "Adobe Fonts включены", "Регулярные обновления"],
        whatsIncluded: ["Активация подписки", "Инструкция по настройке"],
        activation: "Войдите с предоставленным Adobe ID или активируйте код в своём аккаунте.",
      },
    },
    variants: [{ sku: "SHK-DES-001-1M", duration: "1 month", priceMinor: 4999, comparePriceMinor: 6999, stock: 0, names: { en: "1 Month", ar: "شهر واحد", ru: "1 месяц" } }],
  });

  await upsertProduct({
    slug: "jetbrains-all-products-pack",
    sku: "SHK-DEV-001",
    brand: "JetBrains",
    categorySlug: "developer",
    productType: "subscription",
    stockMode: "unlimited",
    basePriceMinor: 6499,
    rating: "4.85",
    reviewCount: 128,
    image: "",
    translations: {
      en: {
        name: "JetBrains All Products Pack",
        short: "IntelliJ IDEA, PyCharm, WebStorm and every JetBrains IDE.",
        desc: "One subscription for every JetBrains IDE: IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, PhpStorm, DataGrip and more.",
        features: ["All JetBrains IDEs", "Free minor & major updates", "Commercial use license", "Cross-platform"],
        whatsIncluded: ["Activation code", "License management guide"],
        activation: "Activate in the JetBrains Toolbox App using your account or the provided license.",
      },
      ar: {
        name: "حزمة جيت برينز الكاملة",
        short: "إنتيليج آيديا وباي تشارم وويب ستورم وكل بيئات جيت برينز.",
        desc: "اشتراك واحد لجميع بيئات تطوير جيت برينز: إنتيليج آيديا ألتيميت وباي تشارم وويب ستورم وفب ستورم وداتا جريب وغيرها.",
        features: ["جميع بيئات جيت برينز", "تحديثات مجانية", "ترخيص للاستخدام التجاري", "متعدد المنصات"],
        whatsIncluded: ["رمز التفعيل", "دليل إدارة الترخيص"],
        activation: "فعّل عبر تطبيق JetBrains Toolbox باستخدام حسابك أو الترخيص المرفق.",
      },
      ru: {
        name: "JetBrains All Products Pack",
        short: "IntelliJ IDEA, PyCharm, WebStorm и все IDE от JetBrains.",
        desc: "Единая подписка на все IDE от JetBrains: IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, PhpStorm, DataGrip и другие.",
        features: ["Все IDE JetBrains", "Бесплатные обновления", "Лицензия для коммерческого использования", "Кроссплатформенность"],
        whatsIncluded: ["Код активации", "Инструкция по лицензии"],
        activation: "Активируйте в JetBrains Toolbox App с помощью аккаунта или предоставленной лицензии.",
      },
    },
    variants: [{ sku: "SHK-DEV-001-1Y", duration: "1 year", priceMinor: 6499, stock: 0, names: { en: "1 Year", ar: "سنة واحدة", ru: "1 год" } }],
  });

  await upsertProduct({
    slug: "steam-wallet-code",
    sku: "SHK-GC-001",
    brand: "Steam",
    categorySlug: "gift-cards",
    productType: "gift_card",
    stockMode: "license_key",
    basePriceMinor: 2500,
    rating: "4.90",
    reviewCount: 780,
    bestseller: true,
    image: "",
    translations: {
      en: {
        name: "Steam Wallet Gift Card",
        short: "Add funds to your Steam Wallet instantly.",
        desc: "Top up your Steam Wallet instantly to buy games, DLC and in-game items on Steam.",
        features: ["Instant delivery", "Global activation (region restrictions may apply)", "No expiration"],
        whatsIncluded: ["Steam wallet code"],
        activation: "Redeem the code in the Steam client or on the Steam website under Wallet > Redeem a Steam Wallet Code.",
      },
      ar: {
        name: "بطاقة محفظة ستيم",
        short: "أضف رصيدًا إلى محفظة ستيم فورًا.",
        desc: "اشحن محفظة ستيم فورًا لشراء الألعاب والمحتوى الإضافي والعناصر داخل اللعبة.",
        features: ["تسليم فوري", "تفعيل عالمي (قد تنطبق قيود إقليمية)", "بدون تاريخ انتهاء"],
        whatsIncluded: ["رمز محفظة ستيم"],
        activation: "فعّل الرمز عبر تطبيق ستيم أو الموقع ضمن المحفظة > استرداد رمز محفظة ستيم.",
      },
      ru: {
        name: "Карта пополнения Steam",
        short: "Мгновенное пополнение кошелька Steam.",
        desc: "Пополните кошелёк Steam мгновенно, чтобы покупать игры, DLC и внутриигровые предметы.",
        features: ["Мгновенная доставка", "Глобальная активация (возможны региональные ограничения)", "Без срока годности"],
        whatsIncluded: ["Код пополнения Steam"],
        activation: "Активируйте код в клиенте Steam или на сайте в разделе Кошелёк > Активировать код Steam.",
      },
    },
    variants: [
      { sku: "SHK-GC-001-25", duration: "$25", priceMinor: 2500, stock: 0, names: { en: "$25", ar: "25 دولار", ru: "$25" } },
      { sku: "SHK-GC-001-50", duration: "$50", priceMinor: 5000, stock: 0, names: { en: "$50", ar: "50 دولار", ru: "$50" } },
    ],
    keysPerVariant: 15,
  });

  await upsertProduct({
    slug: "netflix-premium-4k-1-month",
    sku: "SHK-STR-001",
    brand: "Netflix",
    categorySlug: "streaming",
    productType: "subscription",
    stockMode: "quantity",
    basePriceMinor: 1499,
    comparePriceMinor: 2199,
    isNew: true,
    bestseller: true,
    rating: "4.55",
    reviewCount: 465,
    image: "",
    translations: {
      en: {
        name: "Netflix Premium 4K – 1 Month",
        short: "Ultra HD streaming on up to 4 screens at once.",
        desc: "Enjoy a full month of Netflix Premium with Ultra HD 4K streaming on up to 4 screens simultaneously.",
        features: ["4K Ultra HD", "4 simultaneous screens", "Full catalog access", "Cancel anytime"],
        whatsIncluded: ["Account access or activation instructions"],
        activation: "Login credentials or an upgrade code will be sent to your email/account within minutes.",
      },
      ar: {
        name: "نتفليكس بريميوم 4K - شهر واحد",
        short: "بث فائق الدقة على 4 شاشات في وقت واحد.",
        desc: "استمتع بشهر كامل من نتفليكس بريميوم ببث 4K فائق الدقة على 4 شاشات في وقت واحد.",
        features: ["دقة 4K فائقة", "4 شاشات في آن واحد", "وصول لكامل المكتبة", "إلغاء في أي وقت"],
        whatsIncluded: ["بيانات دخول الحساب أو تعليمات التفعيل"],
        activation: "سيتم إرسال بيانات الدخول أو رمز الترقية إلى بريدك/حسابك خلال دقائق.",
      },
      ru: {
        name: "Netflix Premium 4K – 1 месяц",
        short: "Стриминг Ultra HD на 4 экранах одновременно.",
        desc: "Наслаждайтесь полным месяцем Netflix Premium с потоковым вещанием Ultra HD 4K на 4 экранах одновременно.",
        features: ["4K Ultra HD", "4 экрана одновременно", "Полный доступ к каталогу", "Отмена в любое время"],
        whatsIncluded: ["Данные для входа или инструкция по активации"],
        activation: "Данные для входа или код обновления будут отправлены на почту/аккаунт в течение нескольких минут.",
      },
    },
    variants: [{ sku: "SHK-STR-001-1M", duration: "1 month", priceMinor: 1499, comparePriceMinor: 2199, stock: 40, names: { en: "1 Month", ar: "شهر واحد", ru: "1 месяц" } }],
  });

  await upsertProduct({
    slug: "playstation-plus-essential",
    sku: "SHK-GAM-001",
    brand: "PlayStation",
    categorySlug: "gaming",
    productType: "subscription",
    stockMode: "unlimited",
    basePriceMinor: 999,
    rating: "4.40",
    reviewCount: 213,
    image: "",
    translations: {
      en: {
        name: "PlayStation Plus Essential – 1 Month",
        short: "Online multiplayer, monthly games and exclusive discounts.",
        desc: "PlayStation Plus Essential gives you online multiplayer access, monthly free games and exclusive store discounts.",
        features: ["Online multiplayer", "Monthly free games", "Exclusive discounts", "Cloud storage for saves"],
        whatsIncluded: ["Subscription code"],
        activation: "Redeem the code on your PlayStation console or via the PlayStation Store website.",
      },
      ar: {
        name: "بلايستيشن بلس إسنشال - شهر واحد",
        short: "لعب جماعي عبر الإنترنت وألعاب شهرية وخصومات حصرية.",
        desc: "يمنحك بلايستيشن بلس إسنشال الوصول للعب الجماعي عبر الإنترنت وألعاب مجانية شهرية وخصومات حصرية.",
        features: ["لعب جماعي أونلاين", "ألعاب مجانية شهرية", "خصومات حصرية", "تخزين سحابي للحفظ"],
        whatsIncluded: ["رمز الاشتراك"],
        activation: "فعّل الرمز على جهاز بلايستيشن أو عبر موقع متجر بلايستيشن.",
      },
      ru: {
        name: "PlayStation Plus Essential – 1 месяц",
        short: "Онлайн-мультиплеер, ежемесячные игры и эксклюзивные скидки.",
        desc: "PlayStation Plus Essential открывает доступ к онлайн-мультиплееру, ежемесячным бесплатным играм и эксклюзивным скидкам.",
        features: ["Онлайн-мультиплеер", "Ежемесячные бесплатные игры", "Эксклюзивные скидки", "Облачное хранилище сохранений"],
        whatsIncluded: ["Код подписки"],
        activation: "Активируйте код на консоли PlayStation или на сайте PlayStation Store.",
      },
    },
    variants: [{ sku: "SHK-GAM-001-1M", duration: "1 month", priceMinor: 999, stock: 0, names: { en: "1 Month", ar: "شهر واحد", ru: "1 месяц" } }],
  });

  console.log("Products seeded.");

  // Coupons
  const couponExisting = await db.select().from(coupons).where(eq(coupons.code, "WELCOME10")).limit(1);
  if (!couponExisting[0]) {
    await db.insert(coupons).values({
      code: "WELCOME10",
      description: "10% off your first order",
      type: "percentage",
      value: "10",
      minimumOrderMinor: 1000,
      usageLimit: 1000,
      perUserLimit: 1,
      status: "active",
    });
  }
  const couponExisting2 = await db.select().from(coupons).where(eq(coupons.code, "SAVE5")).limit(1);
  if (!couponExisting2[0]) {
    await db.insert(coupons).values({
      code: "SAVE5",
      description: "$5 off orders over $30",
      type: "fixed",
      value: "5",
      minimumOrderMinor: 3000,
      usageLimit: 500,
      perUserLimit: 2,
      status: "active",
    });
  }

  // FAQs
  const faqData: { category: string; q: Record<string, string>; a: Record<string, string> }[] = [
    {
      category: "orders",
      q: { en: "How fast will I receive my order?", ar: "متى سأستلم طلبي؟", ru: "Как быстро я получу заказ?" },
      a: {
        en: "Most digital products are delivered instantly after payment confirmation. You'll find your keys and instructions in your account and inbox.",
        ar: "يتم تسليم معظم المنتجات الرقمية فورًا بعد تأكيد الدفع. ستجد المفاتيح والتعليمات في حسابك وبريدك الإلكتروني.",
        ru: "Большинство цифровых товаров доставляются мгновенно после подтверждения оплаты. Ключи и инструкции появятся в вашем аккаунте и почте.",
      },
    },
    {
      category: "payments",
      q: { en: "What payment methods are supported?", ar: "ما طرق الدفع المتاحة؟", ru: "Какие способы оплаты поддерживаются?" },
      a: {
        en: "We support major credit/debit cards, PayPal and bank transfer, depending on your region.",
        ar: "ندعم بطاقات الائتمان/الخصم الرئيسية وPayPal والتحويل البنكي حسب منطقتك.",
        ru: "Мы поддерживаем основные кредитные/дебетовые карты, PayPal и банковский перевод в зависимости от региона.",
      },
    },
    {
      category: "refunds",
      q: { en: "Can I get a refund on a license key?", ar: "هل يمكنني استرداد قيمة مفتاح الترخيص؟", ru: "Могу ли я вернуть деньги за ключ лицензии?" },
      a: {
        en: "Unredeemed keys can be refunded within 14 days. Once a key has been revealed or activated, refunds are only available for defective keys.",
        ar: "يمكن استرداد المفاتيح غير المستخدمة خلال 14 يومًا. بعد كشف المفتاح أو تفعيله، يقتصر الاسترداد على المفاتيح المعطوبة فقط.",
        ru: "Неиспользованные ключи можно вернуть в течение 14 дней. После раскрытия или активации ключа возврат возможен только для бракованных ключей.",
      },
    },
    {
      category: "account",
      q: { en: "Do I need an account to buy?", ar: "هل أحتاج حسابًا للشراء؟", ru: "Нужен ли аккаунт для покупки?" },
      a: {
        en: "No, guest checkout is available. However, creating an account lets you track orders and access your digital products anytime.",
        ar: "لا، يمكنك الشراء كضيف. لكن إنشاء حساب يتيح لك تتبع الطلبات والوصول إلى منتجاتك الرقمية في أي وقت.",
        ru: "Нет, доступна оплата как гость. Однако создание аккаунта позволяет отслеживать заказы и получать доступ к товарам в любое время.",
      },
    },
  ];
  for (const [i, f] of faqData.entries()) {
    const existing = await db.select().from(faqTranslations).innerJoin(faqs, eq(faqTranslations.faqId, faqs.id));
    const already = existing.some((e) => e.faq_translations.question === f.q.en);
    if (!already) {
      const [faqRow] = await db.insert(faqs).values({ category: f.category, sortOrder: i }).returning();
      for (const locale of ["en", "ar", "ru"] as const) {
        await db.insert(faqTranslations).values({ faqId: faqRow.id, locale, question: f.q[locale], answer: f.a[locale] });
      }
    }
  }

  // Content pages
  const pages: { slug: string; title: Record<string, string>; content: Record<string, string> }[] = [
    {
      slug: "terms-of-service",
      title: { en: "Terms of Service", ar: "شروط الخدمة", ru: "Условия использования" },
      content: {
        en: "By using SHEROKEY, you agree to purchase digital products for personal or licensed business use only, in accordance with each publisher's license terms. All sales are final once a digital key has been revealed, except where a product is proven defective.",
        ar: "باستخدامك لموقع شيروكي فإنك توافق على شراء المنتجات الرقمية للاستخدام الشخصي أو التجاري المرخص فقط، وفقًا لشروط ترخيص كل ناشر. جميع المبيعات نهائية بعد كشف المفتاح الرقمي، إلا في حال إثبات وجود عطل بالمنتج.",
        ru: "Используя SHEROKEY, вы соглашаетесь приобретать цифровые товары только для личного или лицензированного коммерческого использования в соответствии с условиями лицензии каждого издателя. Все продажи являются окончательными после раскрытия цифрового ключа, за исключением случаев подтверждённого брака.",
      },
    },
    {
      slug: "privacy-policy",
      title: { en: "Privacy Policy", ar: "سياسة الخصوصية", ru: "Политика конфиденциальности" },
      content: {
        en: "We collect only the information necessary to process your orders and improve our service. We never sell your personal data to third parties. Payment details are processed securely by our payment partners.",
        ar: "نجمع فقط المعلومات اللازمة لمعالجة طلباتك وتحسين خدماتنا. لا نبيع بياناتك الشخصية لأطراف ثالثة أبدًا. تتم معالجة بيانات الدفع بأمان من قبل شركائنا في الدفع.",
        ru: "Мы собираем только ту информацию, которая необходима для обработки заказов и улучшения сервиса. Мы никогда не продаём ваши персональные данные третьим лицам. Платёжные данные обрабатываются нашими платёжными партнёрами безопасно.",
      },
    },
    {
      slug: "refund-policy",
      title: { en: "Refund Policy", ar: "سياسة الاسترداد", ru: "Политика возврата" },
      content: {
        en: "Digital products are eligible for refund only if the key/account is defective, already used, or was not delivered due to a technical error on our side. Requests must be submitted within 14 days of purchase via our support page.",
        ar: "تخضع المنتجات الرقمية للاسترداد فقط في حال كان المفتاح/الحساب معطوبًا أو مستخدمًا مسبقًا أو لم يتم تسليمه بسبب خطأ تقني من جانبنا. يجب تقديم الطلبات خلال 14 يومًا من الشراء عبر صفحة الدعم.",
        ru: "Возврат за цифровые товары возможен только если ключ/аккаунт неисправен, уже использован, либо не был доставлен из-за технической ошибки с нашей стороны. Запросы принимаются в течение 14 дней с момента покупки через страницу поддержки.",
      },
    },
    {
      slug: "digital-products-policy",
      title: { en: "Digital Products Policy", ar: "سياسة المنتجات الرقمية", ru: "Политика цифровых товаров" },
      content: {
        en: "All products sold on SHEROKEY are 100% digital. No physical items will be shipped. Delivery occurs via your SHEROKEY account and/or email, typically within minutes of payment confirmation.",
        ar: "جميع المنتجات المباعة على شيروكي رقمية بالكامل. لن يتم شحن أي منتجات مادية. يتم التسليم عبر حسابك في شيروكي و/أو بريدك الإلكتروني، عادةً خلال دقائق من تأكيد الدفع.",
        ru: "Все товары, продаваемые на SHEROKEY, являются полностью цифровыми. Физическая доставка не производится. Доставка осуществляется через ваш аккаунт SHEROKEY и/или email, как правило, в течение нескольких минут после подтверждения оплаты.",
      },
    },
    {
      slug: "cookie-policy",
      title: { en: "Cookie Policy", ar: "سياسة ملفات تعريف الارتباط", ru: "Политика использования файлов cookie" },
      content: {
        en: "We use cookies to remember your language, currency and theme preferences, keep you signed in, and maintain your shopping cart between visits.",
        ar: "نستخدم ملفات تعريف الارتباط لتذكر تفضيلات اللغة والعملة والمظهر، وإبقائك مسجلاً للدخول، والحفاظ على سلة التسوق بين الزيارات.",
        ru: "Мы используем файлы cookie, чтобы запоминать ваши настройки языка, валюты и темы, сохранять вход в систему и корзину между посещениями.",
      },
    },
  ];
  for (const page of pages) {
    let pageRow = (await db.select().from(contentPages).where(eq(contentPages.slug, page.slug)).limit(1))[0];
    if (!pageRow) {
      [pageRow] = await db.insert(contentPages).values({ slug: page.slug }).returning();
    }
    for (const locale of ["en", "ar", "ru"] as const) {
      const existing = await db.select().from(contentPageTranslations).where(eq(contentPageTranslations.pageId, pageRow.id));
      if (!existing.some((e) => e.locale === locale)) {
        await db.insert(contentPageTranslations).values({ pageId: pageRow.id, locale, title: page.title[locale], content: page.content[locale] });
      }
    }
  }

  // Announcement
  const annExisting = await db.select().from(announcements).where(eq(announcements.locale, "en")).limit(1);
  if (!annExisting[0]) {
    await db.insert(announcements).values({ text: "🎉 Use code WELCOME10 for 10% off your first order!", link: "", locale: "en", status: "active" });
    await db.insert(announcements).values({ text: "🎉 استخدم الرمز WELCOME10 للحصول على خصم 10٪ على طلبك الأول!", link: "", locale: "ar", status: "active" });
    await db.insert(announcements).values({ text: "🎉 Используйте код WELCOME10, чтобы получить скидку 10% на первый заказ!", link: "", locale: "ru", status: "active" });
  }

  // Reviews (demo)
  if (demoUser) {
    const wProduct = (await db.select().from(products).where(eq(products.slug, "windows-11-pro-license")).limit(1))[0];
    const cProduct = (await db.select().from(products).where(eq(products.slug, "chatgpt-plus-subscription")).limit(1))[0];
    if (wProduct) {
      const existingReview = await db.select().from(reviews).where(eq(reviews.productId, wProduct.id)).limit(1);
      if (!existingReview[0]) {
        await db.insert(reviews).values({
          productId: wProduct.id,
          userId: demoUser.id,
          rating: 5,
          title: "Worked instantly!",
          comment: "Key was delivered right away and activated without issues. Highly recommend.",
          status: "approved",
          verifiedPurchase: true,
        });
      }
    }
    if (cProduct) {
      const existingReview = await db.select().from(reviews).where(eq(reviews.productId, cProduct.id)).limit(1);
      if (!existingReview[0]) {
        await db.insert(reviews).values({
          productId: cProduct.id,
          userId: demoUser.id,
          rating: 5,
          title: "Great value",
          comment: "Much cheaper than subscribing directly and works perfectly.",
          status: "approved",
          verifiedPurchase: true,
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
