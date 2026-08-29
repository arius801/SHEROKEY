import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/services/audit";

const schema = z.object({
  name: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().toLowerCase().email(),
  orderNumber: z.string().trim().max(32).optional(),
  category: z.enum(["general", "order", "payment", "technical", "refund", "other"]).default("general"),
  subject: z.string().trim().min(3).max(220),
  message: z.string().trim().min(5).max(4000),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`support:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await getCurrentUser();

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: user?.id ?? null,
      email: parsed.data.email,
      name: parsed.data.name || user?.firstName || "",
      subject: parsed.data.subject,
      message: parsed.data.message,
      category: parsed.data.category,
      status: "open",
      priority: "medium",
    })
    .returning();

  await notifyAdmins("support_ticket", `New support ticket #${ticket.id}`, parsed.data.subject, `/admin/support/${ticket.id}`);

  return NextResponse.json({ ok: true, ticketId: ticket.id }, { status: 201 });
}
