import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { addItem, ensureCart, getCartDetails } from "@/lib/services/cart";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

const schema = z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).default(1) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await getCurrentUser();
  try {
    await addItem(user, parsed.data.variantId, parsed.data.quantity);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to add item" }, { status: 400 });
  }

  const localeParam = req.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const cartId = await ensureCart(user);
  const details = await getCartDetails(cartId, locale);
  return NextResponse.json(details, { status: 201 });
}
