import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findCartId, getCartDetails } from "@/lib/services/cart";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const cartId = await findCartId(user);
  const localeParam = req.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const details = await getCartDetails(cartId, locale);
  return NextResponse.json(details);
}
