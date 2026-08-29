import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findCartId, setItemQuantity, removeItem, getCartDetails } from "@/lib/services/cart";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

const schema = z.object({ quantity: z.number().int().min(0).max(20) });

async function currentLocale(req: NextRequest) {
  const localeParam = req.nextUrl.searchParams.get("locale");
  return isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await getCurrentUser();
  const cartId = await findCartId(user);
  if (!cartId) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  await setItemQuantity(cartId, itemId, parsed.data.quantity);
  const details = await getCartDetails(cartId, await currentLocale(req));
  return NextResponse.json(details);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  const user = await getCurrentUser();
  const cartId = await findCartId(user);
  if (!cartId) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  await removeItem(cartId, itemId);
  const details = await getCartDetails(cartId, await currentLocale(req));
  return NextResponse.json(details);
}
