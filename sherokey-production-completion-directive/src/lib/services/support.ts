import "server-only";
import { db } from "@/db";
import { supportTickets, supportTicketReplies, users } from "@/db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { notifyAdmins, notifyUser, logAudit } from "@/lib/services/audit";
import { sendMail } from "@/lib/services/email";

export type TicketAccessor = { userId?: number | null; email?: string | null };

function owns(ticket: { userId: number | null; email: string }, accessor: TicketAccessor): boolean {
  if (accessor.userId && ticket.userId === accessor.userId) return true;
  if (accessor.email && ticket.email.toLowerCase() === accessor.email.toLowerCase()) return true;
  return false;
}

export async function listTicketsForCustomer(accessor: TicketAccessor) {
  if (!accessor.userId && !accessor.email) return [];
  const conditions = [];
  if (accessor.userId) conditions.push(eq(supportTickets.userId, accessor.userId));
  if (accessor.email) conditions.push(eq(supportTickets.email, accessor.email.toLowerCase()));
  return db
    .select()
    .from(supportTickets)
    .where(or(...conditions))
    .orderBy(desc(supportTickets.lastMessageAt));
}

export async function getTicketForCustomer(id: number, accessor: TicketAccessor) {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  const ticket = rows[0];
  if (!ticket || !owns(ticket, accessor)) return null;
  const replies = await db
    .select()
    .from(supportTicketReplies)
    .where(and(eq(supportTicketReplies.ticketId, id), eq(supportTicketReplies.internal, false)))
    .orderBy(supportTicketReplies.createdAt);
  if (ticket.unreadForCustomer) {
    await db.update(supportTickets).set({ unreadForCustomer: false }).where(eq(supportTickets.id, id));
  }
  return { ticket, replies };
}

export async function addCustomerReply(id: number, accessor: TicketAccessor, message: string, authorName: string) {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  const ticket = rows[0];
  if (!ticket || !owns(ticket, accessor)) return null;
  if (ticket.status === "closed") {
    await db.update(supportTickets).set({ status: "open" }).where(eq(supportTickets.id, id));
  }
  await db.insert(supportTicketReplies).values({ ticketId: id, authorRole: "customer", authorName, message });
  await db
    .update(supportTickets)
    .set({ unreadForAdmin: true, lastMessageAt: new Date(), updatedAt: new Date(), status: ticket.status === "closed" ? "open" : ticket.status })
    .where(eq(supportTickets.id, id));
  await notifyAdmins("support_reply", `New reply on ticket #${id}`, message.slice(0, 160), `/admin/support/${id}`);
  return true;
}

export async function listTicketsAdmin(filters: { status?: string; search?: string } = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(supportTickets.status, filters.status));
  if (filters.search) {
    conditions.push(
      or(
        sql`lower(${supportTickets.email}) like ${`%${filters.search.toLowerCase()}%`}`,
        sql`lower(${supportTickets.subject}) like ${`%${filters.search.toLowerCase()}%`}`
      )
    );
  }
  const rows = await db
    .select({ ticket: supportTickets, assignedName: users.firstName })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.assignedToUserId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(supportTickets.lastMessageAt));
  return rows;
}

export async function getTicketAdmin(id: number) {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  const ticket = rows[0];
  if (!ticket) return null;
  const replies = await db.select().from(supportTicketReplies).where(eq(supportTicketReplies.ticketId, id)).orderBy(supportTicketReplies.createdAt);
  if (ticket.unreadForAdmin) {
    await db.update(supportTickets).set({ unreadForAdmin: false }).where(eq(supportTickets.id, id));
  }
  return { ticket, replies };
}

export async function addAdminReply(params: { id: number; message: string; authorName: string; internal: boolean; adminUserId: number }) {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.id, params.id)).limit(1);
  const ticket = rows[0];
  if (!ticket) return null;
  await db.insert(supportTicketReplies).values({
    ticketId: params.id,
    authorRole: "admin",
    authorName: params.authorName,
    message: params.message,
    internal: params.internal,
  });
  await db
    .update(supportTickets)
    .set({
      unreadForCustomer: !params.internal,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      status: !params.internal && ticket.status === "open" ? "answered" : ticket.status,
    })
    .where(eq(supportTickets.id, params.id));

  if (!params.internal) {
    if (ticket.userId) {
      await notifyUser(ticket.userId, "support_reply", "Support replied to your ticket", params.message.slice(0, 160), `/account/support/${params.id}`);
    }
    await sendMail({
      to: ticket.email,
      subject: `Re: ${ticket.subject} (Ticket #${params.id})`,
      html: `<p>${params.message.replace(/\n/g, "<br/>")}</p><p style="color:#64748b;font-size:12px">— SHEROKEY Support</p>`,
    }).catch(() => null);
  }

  await logAudit({ userId: params.adminUserId, action: "admin.support.replied", entityType: "support_ticket", entityId: params.id, metadata: { internal: params.internal } });
  return true;
}

export async function updateTicketAdmin(id: number, updates: { status?: string; priority?: string; assignedToUserId?: number | null }) {
  await db.update(supportTickets).set({ ...updates, updatedAt: new Date() }).where(eq(supportTickets.id, id));
}
