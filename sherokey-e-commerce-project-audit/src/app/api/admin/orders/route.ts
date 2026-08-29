import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/guard";
import { listOrdersAdmin } from "@/lib/services/orders";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const result = await listOrdersAdmin({ status });
  return NextResponse.json(result);
}
