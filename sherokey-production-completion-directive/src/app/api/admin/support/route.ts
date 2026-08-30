import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { listTicketsAdmin } from "@/lib/services/support";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const items = await listTicketsAdmin({ status, search });
  return NextResponse.json({ items });
}
