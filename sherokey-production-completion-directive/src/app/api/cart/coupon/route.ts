import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findCartId, getCartDetails } from "@/lib/services/cart";
import { validateCoupon } from "@/lib/services/coupons";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

const schema = z.object({ code: z.string().trim().min(1).max(64) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await getCurrentUser();
  const cartId = await findCartId(user);
  const localeParam = req.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const { subtotalMinor } = await getCartDetails(cartId, locale);

  const result = await validateCoupon(parsed.data.code, subtotalMinor, user?.id ?? null);
  if (!result.valid) return NextResponse.json({ valid: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({
    valid: true,
    code: result.coupon.code,
    discountMinor: result.discountMinor,
    type: result.coupon.type,
    value: result.coupon.value,
  });
}
