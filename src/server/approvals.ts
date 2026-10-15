import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingSeries, resources, user } from "@/db/schema";
import { sendMails, type Mail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { fmtRange } from "@/lib/time";
import { notify } from "./notifications";
import type { Actor } from "./permissions";

export type Decision = "approved" | "rejected";

function checkNote(decision: Decision, note?: string) {
  if (decision === "rejected" && !note?.trim())
    throw new AppError("VALIDATION", "Add a short reason for the rejection.", { fieldErrors: { note: "Required when rejecting" } });
}

export async function decideBooking(actor: Actor, id: string, decision: Decision, note?: string) {
  checkNote(decision, note);
  const outbox: Mail[] = [];
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
    if (!b) throw new AppError("NOT_FOUND", "Booking not found.");
    if (b.status !== "pending") throw new AppError("CONFLICT", `This booking is already ${b.status}.`);
    if (b.startsAt <= new Date()) throw new AppError("RULE_VIOLATION", "This request has expired because its start time has passed.");
    await tx
      .update(bookings)
      .set({ status: decision, decidedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null })
      .where(eq(bookings.id, id));
    const [r] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, b.resourceId));
    await notify(tx, outbox, [b.userId], {
      type: `booking_${decision}`,
      title: `Booking ${decision}`,
      body: `Your request for ${r.name}, ${fmtRange(b.startsAt, b.endsAt)} was ${decision}.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
      bookingId: id,
    });
  });
  await sendMails(outbox);
}

/** A series is approved or rejected as one unit: every pending, non-expired occurrence in one transaction. */
export async function decideSeries(actor: Actor, seriesId: string, decision: Decision, note?: string) {
  checkNote(decision, note);
  const outbox: Mail[] = [];
  const count = await db.transaction(async (tx) => {
    const [s] = await tx.select().from(bookingSeries).where(eq(bookingSeries.id, seriesId));
    if (!s) throw new AppError("NOT_FOUND", "Series not found.");
    const pending = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.seriesId, seriesId), eq(bookings.status, "pending"), gt(bookings.startsAt, new Date())))
      .for("update");
    if (!pending.length) throw new AppError("CONFLICT", "Nothing in this series is waiting for a decision.");
    await tx
      .update(bookings)
      .set({ status: decision, decidedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null })
      .where(and(eq(bookings.seriesId, seriesId), eq(bookings.status, "pending"), gt(bookings.startsAt, new Date())));
    const [r] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, s.resourceId));
    await notify(tx, outbox, [s.userId], {
      type: `booking_${decision}`,
      title: `Recurring booking ${decision}`,
      body: `Your recurring request for ${r.name} (${pending.length} bookings) was ${decision}.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
      seriesId,
    });
    return pending.length;
  });
  await sendMails(outbox);
  return { count };
}

export type PendingItem =
  | { kind: "single"; id: string; resource: string; assetCode: string; user: string; userId: string; purpose: string | null; startsAt: Date; endsAt: Date }
  | { kind: "series"; id: string; resource: string; assetCode: string; user: string; userId: string; purpose: string | null; pattern: string; startTime: string; endTime: string; count: number; first: Date; last: Date };

/** Pending, non-expired requests: single bookings plus one row per series. */
export async function listPending(): Promise<PendingItem[]> {
  const rows = await db
    .select({
      id: bookings.id,
      seriesId: bookings.seriesId,
      purpose: bookings.purpose,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      resource: resources.name,
      assetCode: resources.assetCode,
      user: user.name,
      userId: user.id,
      pattern: bookingSeries.pattern,
      startTime: bookingSeries.startTime,
      endTime: bookingSeries.endTime,
    })
    .from(bookings)
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .innerJoin(user, eq(bookings.userId, user.id))
    .leftJoin(bookingSeries, eq(bookings.seriesId, bookingSeries.id))
    .where(and(eq(bookings.status, "pending"), gt(bookings.startsAt, new Date())))
    .orderBy(asc(bookings.startsAt));

  const out: PendingItem[] = [];
  const seen = new Map<string, Extract<PendingItem, { kind: "series" }>>();
  for (const r of rows) {
    if (!r.seriesId) {
      out.push({ kind: "single", id: r.id, resource: r.resource, assetCode: r.assetCode, user: r.user, userId: r.userId, purpose: r.purpose, startsAt: r.startsAt, endsAt: r.endsAt });
      continue;
    }
    const existing = seen.get(r.seriesId);
    if (existing) {
      existing.count++;
      existing.last = r.startsAt;
    } else {
      const item = { kind: "series" as const, id: r.seriesId, resource: r.resource, assetCode: r.assetCode, user: r.user, userId: r.userId, purpose: r.purpose, pattern: r.pattern!, startTime: r.startTime!.slice(0, 5), endTime: r.endTime!.slice(0, 5), count: 1, first: r.startsAt, last: r.startsAt };
      seen.set(r.seriesId, item);
      out.push(item);
    }
  }
  return out;
}
