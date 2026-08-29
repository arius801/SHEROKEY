import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import { createUserSession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/services/cart";
import { sendWelcomeEmail } from "@/lib/services/email";
import { logAudit } from "@/lib/services/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  locale: z.string().optional(),
  currency: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { email, password, firstName, lastName } = parsed.data;
  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : DEFAULT_LOCALE;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return NextResponse.json({ error: "emailInUse" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const created = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      firstName,
      lastName,
      locale,
      currency: parsed.data.currency || "USD",
      role: "customer",
      emailVerified: false,
    })
    .returning();

  const user = created[0];
  await createUserSession(user.id);
  await mergeGuestCartIntoUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    locale: user.locale,
    currency: user.currency,
    emailVerified: user.emailVerified,
  });
  await sendWelcomeEmail(user.email, locale).catch(() => null);
  await logAudit({ userId: user.id, action: "user.register", entityType: "user", entityId: user.id, ip });

  return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role } }, { status: 201 });
}
