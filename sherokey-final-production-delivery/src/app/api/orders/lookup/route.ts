import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrderDetail } from "@/lib/services/orders";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ orderNumber: z.string().trim().min(3), email: z.string().trim().toLowerCase().email().optional() });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`order-lookup:${ip}`, 20, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await getCurrentUser();
  const detail = await getOrderDetail(parsed.data.orderNumber.trim().toUpperCase(), { userId: user?.id ?? null, email: parsed.data.email });
  if (!detail) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json(detail);
}
