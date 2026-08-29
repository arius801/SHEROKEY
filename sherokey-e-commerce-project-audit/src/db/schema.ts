import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// i18n / configuration
// ---------------------------------------------------------------------------

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 5 }).notNull().unique(), // en, ar, ru
  name: varchar("name", { length: 64 }).notNull(),
  nativeName: varchar("native_name", { length: 64 }).notNull(),
  direction: varchar("direction", { length: 3 }).notNull().default("ltr"), // ltr | rtl
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 3 }).notNull().unique(), // USD, SAR, RUB
  name: varchar("name", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  decimals: integer("decimals").notNull().default(2),
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  symbolPosition: varchar("symbol_position", { length: 6 }).notNull().default("before"), // before | after
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users / auth
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }),
  role: varchar("role", { length: 16 }).notNull().default("customer"), // customer | admin | manager
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | disabled
  emailVerified: boolean("email_verified").notNull().default(false),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  userAgent: text("user_agent"),
  ip: varchar("ip", { length: 64 }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("sessions_user_idx").on(t.userId),
}));

export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  type: varchar("type", { length: 24 }).notNull(), // email_verify | password_reset
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  icon: varchar("icon", { length: 64 }).default("sparkles"),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | hidden
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categoryTranslations = pgTable("category_translations", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  seoTitle: varchar("seo_title", { length: 200 }),
  seoDescription: text("seo_description"),
}, (t) => ({
  uniq: uniqueIndex("category_translations_cat_locale").on(t.categoryId, t.locale),
}));

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  brand: varchar("brand", { length: 120 }).default(""),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  productType: varchar("product_type", { length: 24 }).notNull().default("license_key"),
  // license_key | subscription | account | download | gift_card | service
  fulfillmentType: varchar("fulfillment_type", { length: 24 }).notNull().default("automatic"), // automatic | manual
  basePriceMinor: integer("base_price_minor").notNull(), // stored in USD minor units (cents)
  comparePriceMinor: integer("compare_price_minor"),
  costPriceMinor: integer("cost_price_minor"),
  status: varchar("status", { length: 16 }).notNull().default("active"), // draft | active | archived
  featured: boolean("featured").notNull().default(false),
  bestseller: boolean("bestseller").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  stockMode: varchar("stock_mode", { length: 16 }).notNull().default("unlimited"), // unlimited | quantity | license_key
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  image: text("image"),
  saleStartsAt: timestamp("sale_starts_at"),
  saleEndsAt: timestamp("sale_ends_at"),
  publishAt: timestamp("publish_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  statusIdx: index("products_status_idx").on(t.status),
  categoryIdx: index("products_category_idx").on(t.categoryId),
}));

export const productTranslations = pgTable("product_translations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: varchar("name", { length: 220 }).notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  whatsIncluded: jsonb("whats_included").$type<string[]>().default([]),
  systemRequirements: text("system_requirements"),
  activationInstructions: text("activation_instructions"),
  faq: jsonb("faq").$type<{ q: string; a: string }[]>().default([]),
  seoTitle: varchar("seo_title", { length: 220 }),
  seoDescription: text("seo_description"),
}, (t) => ({
  uniq: uniqueIndex("product_translations_prod_locale").on(t.productId, t.locale),
}));

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  duration: varchar("duration", { length: 60 }),
  region: varchar("region", { length: 60 }),
  platform: varchar("platform", { length: 60 }),
  licenseType: varchar("license_type", { length: 60 }),
  priceMinor: integer("price_minor").notNull(),
  comparePriceMinor: integer("compare_price_minor"),
  stock: integer("stock").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  productIdx: index("product_variants_product_idx").on(t.productId),
}));

export const productVariantTranslations = pgTable("product_variant_translations", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
}, (t) => ({
  uniq: uniqueIndex("variant_translations_variant_locale").on(t.variantId, t.locale),
}));

// ---------------------------------------------------------------------------
// License key inventory
// ---------------------------------------------------------------------------

export const licenseKeys = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  encryptedKey: text("encrypted_key").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("available"),
  // available | reserved | sold | refunded | invalid
  orderId: integer("order_id"),
  orderItemId: integer("order_item_id"),
  soldToUserId: integer("sold_to_user_id"),
  assignedAt: timestamp("assigned_at"),
  soldAt: timestamp("sold_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  productIdx: index("license_keys_product_idx").on(t.productId),
  statusIdx: index("license_keys_status_idx").on(t.status),
}));

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestToken: varchar("guest_token", { length: 64 }),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userUniq: uniqueIndex("carts_user_uniq").on(t.userId),
  guestUniq: uniqueIndex("carts_guest_uniq").on(t.guestToken),
}));

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("cart_items_cart_variant").on(t.cartId, t.variantId),
}));

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  description: text("description"),
  type: varchar("type", { length: 16 }).notNull().default("percentage"), // percentage | fixed
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  minimumOrderMinor: integer("minimum_order_minor").notNull().default(0),
  maximumDiscountMinor: integer("maximum_discount_minor"),
  usageLimit: integer("usage_limit"),
  perUserLimit: integer("per_user_limit").default(1),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | inactive
  applicableCategoryIds: jsonb("applicable_category_ids").$type<number[]>().default([]),
  applicableProductIds: jsonb("applicable_product_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponUsages = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  orderId: integer("order_id").notNull(),
  discountMinor: integer("discount_minor").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 128 }).default(""),
  lastName: varchar("last_name", { length: 128 }).default(""),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  subtotalMinor: integer("subtotal_minor").notNull(),
  discountMinor: integer("discount_minor").notNull().default(0),
  taxMinor: integer("tax_minor").notNull().default(0),
  totalMinor: integer("total_minor").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending_payment"),
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending"),
  deliveryStatus: varchar("delivery_status", { length: 24 }).notNull().default("pending"),
  couponCode: varchar("coupon_code", { length: 64 }),
  ip: varchar("ip", { length: 64 }),
  notesInternal: text("notes_internal"),
  notesCustomer: text("notes_customer"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("orders_user_idx").on(t.userId),
  statusIdx: index("orders_status_idx").on(t.status),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id").notNull(),
  productNameSnapshot: varchar("product_name_snapshot", { length: 220 }).notNull(),
  variantNameSnapshot: varchar("variant_name_snapshot", { length: 160 }).notNull(),
  productType: varchar("product_type", { length: 24 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  discountMinor: integer("discount_minor").notNull().default(0),
  totalMinor: integer("total_minor").notNull(),
  fulfillmentStatus: varchar("fulfillment_status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("order_items_order_idx").on(t.orderId),
}));

export const orderItemDeliveries = pgTable("order_item_deliveries", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  licenseKeyId: integer("license_key_id"),
  downloadUrl: text("download_url"),
  accountCredentials: jsonb("account_credentials"),
  instructions: text("instructions"),
  deliveredAt: timestamp("delivered_at"),
});

// ---------------------------------------------------------------------------
// Payments / refunds
// ---------------------------------------------------------------------------

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull().unique(),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("payments_order_idx").on(t.orderId),
}));

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  paymentId: integer("payment_id"),
  amountMinor: integer("amount_minor").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 16 }).notNull().default("requested"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

// ---------------------------------------------------------------------------
// Reviews / wishlist
// ---------------------------------------------------------------------------

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: integer("order_id"),
  orderItemId: integer("order_item_id"),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 160 }),
  comment: text("comment"),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | approved | rejected
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  productIdx: index("reviews_product_idx").on(t.productId),
}));

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("wishlist_user_product").on(t.userId, t.productId),
}));

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  orderId: integer("order_id"),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }).default(""),
  subject: varchar("subject", { length: 220 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 40 }).notNull().default("general"),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supportTicketReplies = pgTable("support_ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  authorRole: varchar("author_role", { length: 16 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Notifications / audit logs
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  audience: varchar("audience", { length: 16 }).notNull().default("customer"), // customer | admin
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("notifications_user_idx").on(t.userId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }),
  entityId: varchar("entity_id", { length: 60 }),
  metadata: jsonb("metadata"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Content management (legal pages, faq, banners, announcements)
// ---------------------------------------------------------------------------

export const contentPages = pgTable("content_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contentPageTranslations = pgTable("content_page_translations", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => contentPages.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  content: text("content").notNull(),
  seoTitle: varchar("seo_title", { length: 220 }),
  seoDescription: text("seo_description"),
}, (t) => ({
  uniq: uniqueIndex("content_page_translations_page_locale").on(t.pageId, t.locale),
}));

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 60 }).notNull().default("orders"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("active"),
});

export const faqTranslations = pgTable("faq_translations", {
  id: serial("id").primaryKey(),
  faqId: integer("faq_id").notNull().references(() => faqs.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  question: varchar("question", { length: 300 }).notNull(),
  answer: text("answer").notNull(),
}, (t) => ({
  uniq: uniqueIndex("faq_translations_faq_locale").on(t.faqId, t.locale),
}));

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  subtitle: text("subtitle"),
  image: text("image"),
  ctaText: varchar("cta_text", { length: 80 }),
  ctaLink: varchar("cta_link", { length: 220 }),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  text: varchar("text", { length: 300 }).notNull(),
  link: varchar("link", { length: 220 }),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
});
