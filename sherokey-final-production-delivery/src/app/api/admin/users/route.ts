import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const items = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      locale: users.locale,
      currency: users.currency,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return NextResponse.json({ items });
}
