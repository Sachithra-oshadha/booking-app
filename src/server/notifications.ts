import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { notifications, user } from "@/db/schema";
import type { Mail } from "@/lib/email";
import { ADMIN_ROLE } from "./permissions";

export type Note = { type: string; title: string; body: string; bookingId?: string; seriesId?: string };

/**
 * Insert in-app rows INSIDE the caller's transaction and queue matching emails in `outbox`.
 * The caller sends the outbox with sendMails() after the transaction commits.
 */
export async function notify(tx: Tx, outbox: Mail[], userIds: string[], n: Note) {
  if (process.env.DISABLE_NOTIFICATIONS === "1" || userIds.length === 0) return;
  const ids = [...new Set(userIds)];
  await tx.insert(notifications).values(ids.map((userId) => ({ userId, ...n })));
  const users = await tx.select({ email: user.email }).from(user).where(inArray(user.id, ids));
  const link = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/notifications`;
  for (const u of users) outbox.push({ to: u.email, subject: n.title, text: `${n.body}\n\n${link}` });
}

export async function adminIds(tx: Tx, exceptId?: string) {
  const rows = await tx.select({ id: user.id }).from(user).where(eq(user.role, ADMIN_ROLE));
  return rows.map((r) => r.id).filter((id) => id !== exceptId);
}

export async function unreadCount(userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r.n;
}

export const listNotifications = (userId: string) =>
  db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);

export async function markRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
