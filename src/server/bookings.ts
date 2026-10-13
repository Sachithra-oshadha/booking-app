import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingSeries, resources, user } from "@/db/schema";
import { sendMails, type Mail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { validateSlot } from "@/lib/slot";
import { fmtRange } from "@/lib/time";
import { adminIds, notify } from "./notifications";
import { can, type Actor } from "./permissions";
import { getEffectiveRules } from "./rules";

export const minutes = (n: number) => n * 60_000;

export type BookingInput = { resourceId: string; startsAt: Date; endsAt: Date; purpose?: string };

/** "pending" rows whose start has passed are shown as expired (computed on read, no background job). */
export function displayStatus(b: { status: string; startsAt: Date }, now = new Date()) {
  return b.status === "pending" && b.startsAt <= now ? "expired" : b.status;
}

export async function createBooking(actor: Actor, input: BookingInput) {
  const outbox: Mail[] = [];
  const booking = await db.transaction(async (tx) => {
    const ctx = await getEffectiveRules(input.resourceId, tx);
    if (!ctx) throw new AppError("NOT_FOUND", "Resource not found.");
    if (ctx.resource.status !== "active")
      throw new AppError("RULE_VIOLATION", `This resource is ${ctx.resource.status} and can't be booked.`);
    const [problem] = validateSlot(ctx.rules, input.startsAt, input.endsAt);
    if (problem) throw new AppError("RULE_VIOLATION", problem);

    const status = ctx.rules.requiresApproval ? "pending" : "approved";
    // The exclusion constraint is the final word on overlaps: a clash raises 23P01 (mapped in toResult).
    const [row] = await tx
      .insert(bookings)
      .values({
        resourceId: input.resourceId,
        userId: actor.id,
        purpose: input.purpose || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        blockedUntil: new Date(input.endsAt.getTime() + minutes(ctx.rules.bufferMinutes)),
        status,
        // snapshot: later rule changes never touch existing bookings
        bufferMinutes: ctx.rules.bufferMinutes,
        cancelCutoffMinutes: ctx.rules.cancelCutoffMinutes,
      })
      .returning();

    const when = `${ctx.resource.name}, ${fmtRange(row.startsAt, row.endsAt)}`;
    await notify(tx, outbox, [actor.id], {
      type: status === "pending" ? "booking_requested" : "booking_created",
      title: status === "pending" ? "Booking request sent" : "Booking confirmed",
      body: status === "pending" ? `Your request for ${when} is waiting for approval.` : `You booked ${when}.`,
      bookingId: row.id,
    });
    if (status === "pending") {
      await notify(tx, outbox, await adminIds(tx, actor.id), {
        type: "approval_needed",
        title: "New booking request",
        body: `${actor.name} requested ${when}.`,
        bookingId: row.id,
      });
    }
    return row;
  });
  await sendMails(outbox);
  return booking;
}

/** Can this actor cancel a booking owned by `ownerId` that starts at `startsAt`? Returns an error message or null. */
export function cancelBlocker(actor: Actor, b: { userId: string; startsAt: Date; cancelCutoffMinutes: number }, now = new Date()) {
  if (can(actor, "booking:cancel:any")) return null;
  if (b.userId !== actor.id || !can(actor, "booking:cancel:own")) return "You can only cancel your own bookings.";
  if (now.getTime() > b.startsAt.getTime() - minutes(b.cancelCutoffMinutes))
    return `Too late to cancel: bookings must be cancelled at least ${b.cancelCutoffMinutes} minutes before they start.`;
  return null;
}

export async function cancelBooking(actor: Actor, id: string) {
  const outbox: Mail[] = [];
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
    if (!b) throw new AppError("NOT_FOUND", "Booking not found.");
    if (b.status !== "pending" && b.status !== "approved") throw new AppError("CONFLICT", `This booking is already ${b.status}.`);
    const blocker = cancelBlocker(actor, b);
    if (blocker) throw new AppError(can(actor, "booking:cancel:any") ? "RULE_VIOLATION" : "FORBIDDEN", blocker);

    await tx.update(bookings).set({ status: "cancelled", cancelledBy: actor.id, cancelledAt: new Date() }).where(eq(bookings.id, id));

    const [r] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, b.resourceId));
    const body = `Booking for ${r.name}, ${fmtRange(b.startsAt, b.endsAt)} was cancelled${actor.id === b.userId ? "" : " by an admin"}.`;
    await notify(tx, outbox, [b.userId], { type: "booking_cancelled", title: "Booking cancelled", body, bookingId: id });
    if (actor.id === b.userId && b.status === "pending") {
      await notify(tx, outbox, await adminIds(tx, actor.id), {
        type: "booking_cancelled",
        title: "Pending request cancelled",
        body: `${actor.name} cancelled their pending request: ${r.name}, ${fmtRange(b.startsAt, b.endsAt)}.`,
        bookingId: id,
      });
    }
  });
  await sendMails(outbox);
}

// ---------- queries ----------
const bookingColumns = {
  id: bookings.id,
  seriesId: bookings.seriesId,
  purpose: bookings.purpose,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  blockedUntil: bookings.blockedUntil,
  status: bookings.status,
  cancelCutoffMinutes: bookings.cancelCutoffMinutes,
  decisionNote: bookings.decisionNote,
  userId: bookings.userId,
  userName: user.name,
  resourceId: resources.id,
  resourceName: resources.name,
  assetCode: resources.assetCode,
};

const base = () =>
  db
    .select(bookingColumns)
    .from(bookings)
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .innerJoin(user, eq(bookings.userId, user.id));

export type BookingRow = Awaited<ReturnType<typeof myBookings>>[number];

export async function myBookings(userId: string, tab: "upcoming" | "past" | "cancelled") {
  const mine = eq(bookings.userId, userId);
  const now = new Date();
  // upcoming: approved and not finished yet, or pending and not started yet
  const upcoming = or(
    and(eq(bookings.status, "approved"), gte(bookings.endsAt, now)),
    and(eq(bookings.status, "pending"), gte(bookings.startsAt, now)),
  );
  // past: approved and finished, or pending that never got decided before it started (shown as Expired)
  const past = or(
    and(eq(bookings.status, "approved"), lt(bookings.endsAt, now)),
    and(eq(bookings.status, "pending"), lt(bookings.startsAt, now)),
  );
  if (tab === "cancelled") return base().where(and(mine, inArray(bookings.status, ["cancelled", "rejected"]))).orderBy(desc(bookings.startsAt));
  if (tab === "upcoming") return base().where(and(mine, upcoming)).orderBy(asc(bookings.startsAt));
  return base().where(and(mine, past)).orderBy(desc(bookings.startsAt));
}

export type AdminBookingFilters = {
  status?: string;
  resourceId?: string;
  user?: string;
  from?: Date;
  to?: Date;
  page?: number;
};
export const ADMIN_PAGE_SIZE = 25;

export async function adminBookings(f: AdminBookingFilters) {
  const where = and(
    f.status && f.status !== "expired" ? eq(bookings.status, f.status as "pending") : undefined,
    f.status === "expired" ? and(eq(bookings.status, "pending"), lt(bookings.startsAt, new Date())) : undefined,
    f.resourceId ? eq(bookings.resourceId, f.resourceId) : undefined,
    f.user ? or(ilike(user.name, `%${f.user}%`), ilike(user.email, `%${f.user}%`)) : undefined,
    f.from ? gte(bookings.startsAt, f.from) : undefined,
    f.to ? lt(bookings.startsAt, f.to) : undefined,
  );
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .innerJoin(user, eq(bookings.userId, user.id))
    .where(where);
  const rows = await base()
    .where(where)
    .orderBy(desc(bookings.startsAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(((f.page ?? 1) - 1) * ADMIN_PAGE_SIZE);
  return { rows, total: n };
}

/** Bookings that block this resource's calendar (pending + approved), from `since` onwards. */
export const calendarBookings = (resourceId: string, daysBack = 7) =>
  db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      userName: user.name,
      purpose: bookings.purpose,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      blockedUntil: bookings.blockedUntil,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(user, eq(bookings.userId, user.id))
    .where(and(eq(bookings.resourceId, resourceId), inArray(bookings.status, ["pending", "approved"]), gte(bookings.blockedUntil, new Date(Date.now() - daysBack * 24 * 3600_000))));

export async function seriesInfo(ids: string[]) {
  if (!ids.length) return new Map<string, { pattern: string; count: number }>();
  const rows = await db
    .select({ id: bookingSeries.id, pattern: bookingSeries.pattern, count: sql<number>`(select count(*)::int from bookings b where b.series_id = ${bookingSeries.id})` })
    .from(bookingSeries)
    .where(inArray(bookingSeries.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
