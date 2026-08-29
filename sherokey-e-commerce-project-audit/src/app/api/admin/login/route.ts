import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/crypto";
import { createUserSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/services/audit";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

// Dedicated administrator login endpoint: intentionally separate from the
// customer-facing /api/auth/login so that only accounts with role
// "admin" or "manager" can authenticate here, even if they know a valid
// customer password for a different account.
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "manager") {
    await logAudit({ userId: user.id, action: "admin.login_denied", entityType: "user", entityId: user.id, ip });
    return NextResponse.json({ error: "NOT_AN_ADMIN" }, { status: 403 });
  }
  if (user.status === "disabled") {
    return NextResponse.json({ error: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  await createUserSession(user.id);
  await logAudit({ userId: user.id, action: "admin.login", entityType: "user", entityId: user.id, ip });

  return NextResponse.json({ ok: true, role: user.role });
}
