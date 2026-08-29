import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), locale: z.string().optional() });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`forgot:${ip}`, 6, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : DEFAULT_LOCALE;
  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];

  if (user) {
    const token = randomToken(24);
    await db.insert(verificationTokens).values({
      userId: user.id,
      token,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, locale, url).catch(() => null);
  }

  // Always respond success to avoid leaking which emails are registered.
  return NextResponse.json({ ok: true });
}
