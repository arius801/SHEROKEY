import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/locales";

const schema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  locale: z.string().optional(),
  currency: z.string().trim().length(3).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.locale !== undefined && isLocale(parsed.data.locale)) updates.locale = parsed.data.locale;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency.toUpperCase();

  await db.update(users).set(updates).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
