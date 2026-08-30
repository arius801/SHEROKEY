import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { verificationTokens, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import { destroyAllSessions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rows = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, parsed.data.token), eq(verificationTokens.type, "password_reset")))
    .limit(1);
  const record = rows[0];
  if (!record || record.usedAt || new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({ error: "invalidToken" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, record.id));
  await destroyAllSessions(record.userId);

  return NextResponse.json({ ok: true });
}
