import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

/** Returns the authenticated admin/manager user, or a 401/403 NextResponse to return immediately. */
export async function requireAdminApi(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  if (user.role !== "admin" && user.role !== "manager") {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { user };
}
