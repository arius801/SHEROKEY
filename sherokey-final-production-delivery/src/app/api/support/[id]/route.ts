import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getTicketForCustomer, addCustomerReply } from "@/lib/services/support";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const email = req.nextUrl.searchParams.get("email");
  if (!user && !email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await getTicketForCustomer(Number(id), { userId: user?.id ?? null, email });
  if (!result) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(result);
}

const replySchema = z.object({ message: z.string().trim().min(1).max(4000), email: z.string().email().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`support-reply:${ip}`, 30, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const { id } = await params;
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  if (!user && !parsed.data.email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const result = await addCustomerReply(
    Number(id),
    { userId: user?.id ?? null, email: parsed.data.email ?? null },
    parsed.data.message,
    user ? `${user.firstName} ${user.lastName}`.trim() : "Customer"
  );
  if (!result) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
