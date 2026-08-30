import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, destroyAllSessions, createUserSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const record = rows[0];
  if (!record || !(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return NextResponse.json({ error: "invalidCredentials" }, { status: 401 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
  await destroyAllSessions(user.id);
  await createUserSession(user.id);

  return NextResponse.json({ ok: true });
}
