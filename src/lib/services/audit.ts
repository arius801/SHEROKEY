import "server-only";
import { db } from "@/db";
import { auditLogs, notifications } from "@/db/schema";

export async function logAudit(params: {
  userId?: number | null;
  action: string;
  entityType?: string;
  entityId?: string | number;
  metadata?: unknown;
  ip?: string | null;
}) {
  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId != null ? String(params.entityId) : undefined,
    metadata: params.metadata as object,
    ip: params.ip ?? undefined,
  });
}

export async function notifyUser(userId: number, type: string, title: string, message: string, link?: string) {
  await db.insert(notifications).values({ userId, audience: "customer", type, title, message, link });
}

export async function notifyAdmins(type: string, title: string, message: string, link?: string) {
  await db.insert(notifications).values({ userId: null, audience: "admin", type, title, message, link });
}
