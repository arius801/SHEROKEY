import "server-only";
import { cookies } from "next/headers";
import { db } from "@/db";
import { carts, cartItems, productVariants, products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomToken } from "@/lib/crypto";
import { GUEST_CART_COOKIE } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { productTranslations, productVariantTranslations } from "@/db/schema";
import type { Locale } from "@/lib/i18n/locales";

export type CartLineItem = {
  id: number;
  productId: number;
  variantId: number;
  slug: string;
  image: string | null;
  name: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
  compareMinor: number | null;
  lineTotalMinor: number;
  stock: number;
  status: string;
  stockMode: string;
  productType: string;
};

export async function getCartDetails(cartId: number | null, locale: Locale) {
  if (!cartId) return { items: [] as CartLineItem[], subtotalMinor: 0 };

  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      slug: products.slug,
      image: products.image,
      productType: products.productType,
      stockMode: products.stockMode,
      productStock: products.stockQuantity,
      priceMinor: productVariants.priceMinor,
      compareMinor: productVariants.comparePriceMinor,
      variantStock: productVariants.stock,
      variantStatus: productVariants.status,
      productStatus: products.status,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cartId));

  const items: CartLineItem[] = [];
  let subtotalMinor = 0;

  for (const row of rows) {
    const nameRows = await db
      .select({ locale: productTranslations.locale, name: productTranslations.name })
      .from(productTranslations)
      .where(eq(productTranslations.productId, row.productId));
    const name = nameRows.find((n) => n.locale === locale)?.name ?? nameRows.find((n) => n.locale === "en")?.name ?? "";

    const variantNameRows = await db
      .select({ locale: productVariantTranslations.locale, name: productVariantTranslations.name })
      .from(productVariantTranslations)
      .where(eq(productVariantTranslations.variantId, row.variantId));
    const variantName =
      variantNameRows.find((n) => n.locale === locale)?.name ?? variantNameRows.find((n) => n.locale === "en")?.name ?? "";

    const price = row.priceMinor;
    const lineTotal = price * row.quantity;
    subtotalMinor += lineTotal;

    items.push({
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      slug: row.slug,
      image: row.image,
      name,
      variantName,
      quantity: row.quantity,
      unitPriceMinor: price,
      compareMinor: row.compareMinor,
      lineTotalMinor: lineTotal,
      stock: row.stockMode === "quantity" ? row.variantStock : Number.MAX_SAFE_INTEGER,
      status: row.productStatus === "active" && row.variantStatus === "active" ? "active" : "unavailable",
      stockMode: row.stockMode,
      productType: row.productType,
    });
  }

  return { items, subtotalMinor };
}

export async function ensureCart(user: SessionUser | null): Promise<number> {
  if (user) {
    const existing = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (existing[0]) return existing[0].id;
    const created = await db.insert(carts).values({ userId: user.id, currency: user.currency || "USD" }).returning();
    return created[0].id;
  }

  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (token) {
    const existing = await db.select().from(carts).where(eq(carts.guestToken, token)).limit(1);
    if (existing[0]) return existing[0].id;
  }
  token = randomToken(20);
  cookieStore.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  const created = await db.insert(carts).values({ guestToken: token }).returning();
  return created[0].id;
}

export async function findCartId(user: SessionUser | null): Promise<number | null> {
  if (user) {
    const existing = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, user.id)).limit(1);
    return existing[0]?.id ?? null;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!token) return null;
  const existing = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestToken, token)).limit(1);
  return existing[0]?.id ?? null;
}

export async function addItem(user: SessionUser | null, variantId: number, quantity: number) {
  const variant = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!variant[0]) throw new Error("Variant not found");
  const product = await db.select().from(products).where(eq(products.id, variant[0].productId)).limit(1);
  if (!product[0] || product[0].status !== "active") throw new Error("Product not available");

  const cartId = await ensureCart(user);
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      productId: product[0].id,
      variantId,
      quantity,
    });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  return cartId;
}

export async function setItemQuantity(cartId: number, itemId: number, quantity: number) {
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  } else {
    await db.update(cartItems).set({ quantity }).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  }
}

export async function removeItem(cartId: number, itemId: number) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function clearCart(cartId: number) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

export async function mergeGuestCartIntoUser(user: SessionUser) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!token) return;
  const guestCart = await db.select().from(carts).where(eq(carts.guestToken, token)).limit(1);
  if (!guestCart[0]) return;

  const userCartId = await ensureCart(user);
  const guestItems = await db.select().from(cartItems).where(eq(cartItems.cartId, guestCart[0].id));

  for (const item of guestItems) {
    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, userCartId), eq(cartItems.variantId, item.variantId)))
      .limit(1);
    if (existing[0]) {
      await db.update(cartItems).set({ quantity: existing[0].quantity + item.quantity }).where(eq(cartItems.id, existing[0].id));
    } else {
      await db.insert(cartItems).values({ cartId: userCartId, productId: item.productId, variantId: item.variantId, quantity: item.quantity });
    }
  }

  await db.delete(carts).where(eq(carts.id, guestCart[0].id));
  cookieStore.delete(GUEST_CART_COOKIE);
}
