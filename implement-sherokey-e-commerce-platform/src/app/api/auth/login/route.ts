import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/crypto";
import { createUserSession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/services/cart";
import { logAudit } from "@/lib/services/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`login:${ip}`, 15, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await logAudit({ action: "user.login_failed", metadata: { email: parsed.data.email }, ip });
    return NextResponse.json({ error: "invalidCredentials" }, { status: 401 });
  }
  if (user.status === "disabled") {
    return NextResponse.json({ error: "accountDisabled" }, { status: 403 });
  }

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
  await logAudit({ userId: user.id, action: "user.login", entityType: "user", entityId: user.id, ip });

  return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role } });
}
