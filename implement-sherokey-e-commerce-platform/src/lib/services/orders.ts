import "server-only";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderItemDeliveries,
  products,
  productTranslations,
  licenseKeys,
  payments,
  users,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCartDetails, clearCart } from "@/lib/services/cart";
import { validateCoupon, recordCouponUsage } from "@/lib/services/coupons";
import { getCurrencyByCode, getDefaultCurrency } from "@/lib/services/currency";
import { convertMinor } from "@/lib/money";
import { getStoreSettings } from "@/lib/services/settings";
import { notifyUser, notifyAdmins, logAudit } from "@/lib/services/audit";
import { sendOrderPaidEmail } from "@/lib/services/email";
import type { Locale } from "@/lib/i18n/locales";
import type { SessionUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";

export class OrderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function createOrderFromCart(params: {
  cartId: number;
  user: SessionUser | null;
  email: string;
  firstName: string;
  lastName: string;
  locale: Locale;
  currencyCode: string;
  couponCode?: string;
  ip?: string | null;
  termsAccepted: boolean;
}) {
  if (!params.termsAccepted) throw new OrderError("TERMS_REQUIRED", "You must accept the terms to continue");

  const { items, subtotalMinor: subtotalUsd } = await getCartDetails(params.cartId, params.locale);
  if (items.length === 0) throw new OrderError("EMPTY_CART", "Your cart is empty");

  const unavailable = items.filter((i) => i.status !== "active" || (i.stockMode === "quantity" && i.stock < i.quantity));
  if (unavailable.length > 0) {
    throw new OrderError("ITEMS_UNAVAILABLE", `Some items are no longer available: ${unavailable.map((i) => i.name).join(", ")}`);
  }

  const settings = await getStoreSettings();
  if (settings.minOrderMinor && subtotalUsd < settings.minOrderMinor) {
    throw new OrderError("MIN_ORDER", "Order does not meet the minimum order value");
  }

  let discountUsd = 0;
  let couponRow: Awaited<ReturnType<typeof validateCoupon>> | null = null;
  if (params.couponCode) {
    const result = await validateCoupon(params.couponCode, subtotalUsd, params.user?.id ?? null);
    if (!result.valid) throw new OrderError("INVALID_COUPON", "This coupon is invalid or expired");
    discountUsd = result.discountMinor;
    couponRow = result;
  }

  const taxableUsd = Math.max(subtotalUsd - discountUsd, 0);
  const taxUsd = settings.taxRatePercent > 0 ? Math.round((taxableUsd * settings.taxRatePercent) / 100) : 0;
  const totalUsd = taxableUsd + taxUsd;

  const currency = (await getCurrencyByCode(params.currencyCode)) ?? (await getDefaultCurrency());

  const subtotalMinor = convertMinor(subtotalUsd, currency);
  const discountMinor = convertMinor(discountUsd, currency);
  const taxMinor = convertMinor(taxUsd, currency);
  const totalMinor = convertMinor(totalUsd, currency);

  const tempNumber = `TMP-${randomToken(8)}`;
  const inserted = await db
    .insert(orders)
    .values({
      orderNumber: tempNumber,
      userId: params.user?.id ?? null,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      locale: params.locale,
      currency: currency.code,
      exchangeRate: String(currency.exchangeRate),
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor,
      status: "pending_payment",
      paymentStatus: "pending",
      deliveryStatus: "pending",
      couponCode: params.couponCode?.toUpperCase(),
      ip: params.ip ?? undefined,
      termsAcceptedAt: new Date(),
    })
    .returning();

  const order = inserted[0];
  const year = new Date().getFullYear();
  const orderNumber = `SHK-${year}-${String(order.id).padStart(6, "0")}`;
  await db.update(orders).set({ orderNumber }).where(eq(orders.id, order.id));

  for (const item of items) {
    const lineDiscount = subtotalUsd > 0 ? Math.round((item.lineTotalMinor / subtotalUsd) * discountUsd) : 0;
    const unitPriceMinor = convertMinor(item.unitPriceMinor, currency);
    const lineTotalMinor = convertMinor(item.lineTotalMinor - lineDiscount, currency);
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.name,
      variantNameSnapshot: item.variantName,
      productType: item.productType,
      quantity: item.quantity,
      unitPriceMinor,
      discountMinor: convertMinor(lineDiscount, currency),
      totalMinor: lineTotalMinor,
      fulfillmentStatus: "pending",
    });
  }

  if (couponRow && couponRow.valid) {
    await recordCouponUsage(couponRow.coupon.id, params.user?.id ?? null, order.id, discountMinor);
  }

  await clearCart(params.cartId);
  await logAudit({ userId: params.user?.id ?? null, action: "order.created", entityType: "order", entityId: order.id, ip: params.ip });

  return { ...order, orderNumber };
}

/** Confirms payment and triggers automatic digital fulfillment. Idempotent per transactionId. */
export async function confirmOrderPayment(params: {
  orderId: number;
  provider: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
  metadata?: unknown;
}) {
  return db.transaction(async (tx) => {
    const existingPayment = await tx.select().from(payments).where(eq(payments.transactionId, params.transactionId)).limit(1);
    if (existingPayment[0] && existingPayment[0].status === "paid") {
      return { alreadyProcessed: true, orderId: params.orderId };
    }

    const orderRows = await tx.execute(sql`SELECT * FROM orders WHERE id = ${params.orderId} FOR UPDATE`);
    const order = orderRows.rows[0] as typeof orders.$inferSelect | undefined;
    if (!order) throw new OrderError("ORDER_NOT_FOUND", "Order not found");

    if (order.paymentStatus === "paid") {
      return { alreadyProcessed: true, orderId: order.id };
    }

    if (existingPayment[0]) {
      await tx.update(payments).set({ status: "paid", updatedAt: new Date() }).where(eq(payments.id, existingPayment[0].id));
    } else {
      await tx.insert(payments).values({
        orderId: order.id,
        provider: params.provider,
        transactionId: params.transactionId,
        amountMinor: params.amountMinor,
        currency: params.currency,
        status: "paid",
        metadata: params.metadata as object,
      });
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    let allDelivered = true;

    for (const item of items) {
      const productRows = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      const product = productRows[0];
      if (!product) continue;

      if (product.stockMode === "license_key") {
        const keyRows = await tx.execute(
          sql`SELECT id FROM license_keys WHERE product_id = ${item.productId} AND variant_id = ${item.variantId} AND status = 'available' ORDER BY id ASC LIMIT ${item.quantity} FOR UPDATE SKIP LOCKED`
        );
        const availableIds = keyRows.rows.map((r) => (r as { id: number }).id);

        if (availableIds.length < item.quantity) {
          allDelivered = false;
          await tx.update(orderItems).set({ fulfillmentStatus: "failed" }).where(eq(orderItems.id, item.id));
          continue;
        }

        for (const keyId of availableIds) {
          await tx
            .update(licenseKeys)
            .set({ status: "sold", orderId: order.id, orderItemId: item.id, soldToUserId: order.userId, assignedAt: new Date(), soldAt: new Date() })
            .where(eq(licenseKeys.id, keyId));

          const productTr = await tx
            .select()
            .from(productTranslations)
            .where(and(eq(productTranslations.productId, item.productId), eq(productTranslations.locale, order.locale)))
            .limit(1);
          const instructions = productTr[0]?.activationInstructions ?? "";

          await tx.insert(orderItemDeliveries).values({
            orderItemId: item.id,
            licenseKeyId: keyId,
            instructions,
            deliveredAt: new Date(),
          });
        }

        await tx.update(orderItems).set({ fulfillmentStatus: "delivered" }).where(eq(orderItems.id, item.id));
      } else if (product.stockMode === "quantity") {
        const updated = await tx.execute(
          sql`UPDATE product_variants SET stock = stock - ${item.quantity} WHERE id = ${item.variantId} AND stock >= ${item.quantity} RETURNING id`
        );
        if (updated.rows.length === 0) {
          allDelivered = false;
          await tx.update(orderItems).set({ fulfillmentStatus: "failed" }).where(eq(orderItems.id, item.id));
          continue;
        }
        const productTr = await tx
          .select()
          .from(productTranslations)
          .where(and(eq(productTranslations.productId, item.productId), eq(productTranslations.locale, order.locale)))
          .limit(1);
        await tx.insert(orderItemDeliveries).values({
          orderItemId: item.id,
          instructions: productTr[0]?.activationInstructions ?? "",
          deliveredAt: new Date(),
        });
        await tx.update(orderItems).set({ fulfillmentStatus: "delivered" }).where(eq(orderItems.id, item.id));
      } else if (product.fulfillmentType === "automatic") {
        const productTr = await tx
          .select()
          .from(productTranslations)
          .where(and(eq(productTranslations.productId, item.productId), eq(productTranslations.locale, order.locale)))
          .limit(1);
        await tx.insert(orderItemDeliveries).values({
          orderItemId: item.id,
          instructions: productTr[0]?.activationInstructions ?? "",
          deliveredAt: new Date(),
        });
        await tx.update(orderItems).set({ fulfillmentStatus: "delivered" }).where(eq(orderItems.id, item.id));
      } else {
        allDelivered = false;
        await tx.update(orderItems).set({ fulfillmentStatus: "pending" }).where(eq(orderItems.id, item.id));
      }

    }

    const newStatus = allDelivered ? "completed" : "processing";
    const deliveryStatus = allDelivered ? "delivered" : "processing";

    await tx
      .update(orders)
      .set({ paymentStatus: "paid", status: newStatus, deliveryStatus, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    if (!allDelivered) {
      await notifyAdmins(
        "fulfillment_issue",
        `Order #${order.orderNumber} needs attention`,
        "One or more items could not be fulfilled automatically (out of stock or manual fulfillment required).",
        `/admin/orders/${order.id}`
      );
    }

    await notifyAdmins("new_order", `New order #${order.orderNumber}`, `A new order totaling ${(order.totalMinor / 100).toFixed(2)} ${order.currency} was paid.`, `/admin/orders/${order.id}`);

    if (order.userId) {
      await notifyUser(order.userId, "order_paid", "Payment confirmed", `Your order #${order.orderNumber} has been paid and is being delivered.`, `/account/orders/${order.id}`);
    }

    await logAudit({ userId: order.userId, action: "order.paid", entityType: "order", entityId: order.id });

    return { alreadyProcessed: false, orderId: order.id, orderNumber: order.orderNumber, email: order.email, locale: order.locale as Locale };
  });
}

export async function sendPaymentConfirmationEmail(orderId: number) {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return;
  await sendOrderPaidEmail(order.email, order.locale as Locale, order.orderNumber);
}

export async function getUserRecord(userId: number) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function listOrdersForUser(userId: number) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(sql`${orders.createdAt} desc`);
}

export type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;

/** Fetch a full order (with items + deliveries + decrypted keys) scoped to a customer accessor (user id or guest email). */
export async function getOrderDetail(orderNumber: string, accessor: { userId?: number | null; email?: string | null }) {
  const orderRows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  const order = orderRows[0];
  if (!order) return null;

  const owns = (accessor.userId && order.userId === accessor.userId) || (!!accessor.email && order.email.toLowerCase() === accessor.email.toLowerCase());
  if (!owns) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const detailedItems = [];
  for (const item of items) {
    const deliveries = await db.select().from(orderItemDeliveries).where(eq(orderItemDeliveries.orderItemId, item.id));
    const revealedDeliveries = [];
    for (const d of deliveries) {
      let key: string | null = null;
      if (d.licenseKeyId) {
        const keyRows = await db.select().from(licenseKeys).where(eq(licenseKeys.id, d.licenseKeyId)).limit(1);
        if (keyRows[0]) {
          const { decryptSecret } = await import("@/lib/crypto");
          key = decryptSecret(keyRows[0].encryptedKey);
        }
      }
      revealedDeliveries.push({ ...d, key });
    }
    detailedItems.push({ ...item, deliveries: revealedDeliveries });
  }

  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, order.id));

  return { order, items: detailedItems, payments: paymentRows };
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

export async function listOrdersAdmin(filters: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
  const conditions = [] as ReturnType<typeof eq>[];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(sql`${orders.createdAt} desc`)
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(whereClause);
  return { items: rows, total: countRows[0]?.count ?? rows.length };
}

export async function getOrderAdmin(id: number) {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const detailedItems = [];
  for (const item of items) {
    const deliveries = await db.select().from(orderItemDeliveries).where(eq(orderItemDeliveries.orderItemId, item.id));
    detailedItems.push({ ...item, deliveries });
  }
  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, order.id));
  return { order, items: detailedItems, payments: paymentRows };
}

export async function updateOrderStatusAdmin(id: number, status: string) {
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
}
