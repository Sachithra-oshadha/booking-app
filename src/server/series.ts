import { and, eq, gt, inArray, lt, gte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingSeries, resources } from "@/db/schema";
import { sendMails, type Mail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { expandOccurrences, MAX_OCCURRENCES, validateSlot } from "@/lib/slot";
import { fmt, fromLocal } from "@/lib/time";
import { cancelBlocker, minutes } from "./bookings";
import { adminIds, notify } from "./notifications";
import { can, type Actor } from "./permissions";
import { getEffectiveRules } from "./rules";

export type SeriesInput = {
  resourceId: string;
  pattern: "daily" | "weekly";
  startDate: string;
  untilDate?: string;
  occurrenceCount?: number;
  startTime: string;
  endTime: string;
  purpose?: string;
};

export type Clash = { date: string; reason: string };

/** All-or-nothing: any rule failure or clash saves nothing and returns the full list as `details.clashes`. */
export async function createSeries(actor: Actor, input: SeriesInput) {
  const outbox: Mail[] = [];
  const series = await db.transaction(async (tx) => {
    const ctx = await getEffectiveRules(input.resourceId, tx);
    if (!ctx) throw new AppError("NOT_FOUND", "Resource not found.");
    if (ctx.resource.status !== "active")
      throw new AppError("RULE_VIOLATION", `This resource is ${ctx.resource.status} and can't be booked.`);
    const { rules } = ctx;

    const { dates, tooMany } = expandOccurrences(input, rules.workingDays);
    if (tooMany) throw new AppError("RULE_VIOLATION", `A series can have at most ${MAX_OCCURRENCES} occurrences. Shorten the end date.`);
    if (dates.length === 0) throw new AppError("RULE_VIOLATION", "No working days fall inside that range.");

    const occ = dates.map((date) => {
      const startsAt = fromLocal(date, input.startTime);
      const endsAt = fromLocal(date, input.endTime);
      return { date, startsAt, endsAt, blockedUntil: new Date(endsAt.getTime() + minutes(rules.bufferMinutes)) };
    });

    // 1) rule failures
    const problems: Clash[] = [];
    const ok: typeof occ = [];
    for (const o of occ) {
      const [reason] = validateSlot(rules, o.startsAt, o.endsAt);
      if (reason) problems.push({ date: o.date, reason });
      else ok.push(o);
    }

    // 2) overlaps with existing pending/approved bookings
    if (ok.length) {
      const existing = await tx
        .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt, blockedUntil: bookings.blockedUntil })
        .from(bookings)
        .where(
          and(
            eq(bookings.resourceId, input.resourceId),
            inArray(bookings.status, ["pending", "approved"]),
            lt(bookings.startsAt, ok[ok.length - 1].blockedUntil),
            gt(bookings.blockedUntil, ok[0].startsAt),
          ),
        );
      for (const o of ok) {
        const hit = existing.find((e) => e.startsAt < o.blockedUntil && o.startsAt < e.blockedUntil);
        if (hit) problems.push({ date: o.date, reason: `Already booked (${fmt(hit.startsAt, "HH:mm")}–${fmt(hit.endsAt, "HH:mm")}, plus buffer).` });
      }
    }
    if (problems.length) {
      problems.sort((a, b) => a.date.localeCompare(b.date));
      throw new AppError("RULE_VIOLATION", `${problems.length} of ${occ.length} dates can't be booked, so nothing was saved.`, {
        details: { clashes: problems },
      });
    }

    const status = rules.requiresApproval && !can(actor, "booking:approve") ? ("pending" as const) : ("approved" as const);
    const [s] = await tx
      .insert(bookingSeries)
      .values({
        userId: actor.id,
        resourceId: input.resourceId,
        pattern: input.pattern,
        startDate: input.startDate,
        untilDate: input.untilDate ?? null,
        occurrenceCount: input.occurrenceCount ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        purpose: input.purpose || null,
      })
      .returning();
    // If the exclusion constraint still fires (a race), the whole transaction rolls back.
    await tx.insert(bookings).values(
      occ.map((o) => ({
        resourceId: input.resourceId,
        userId: actor.id,
        seriesId: s.id,
        purpose: input.purpose || null,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        blockedUntil: o.blockedUntil,
        status,
        bufferMinutes: rules.bufferMinutes,
        cancelCutoffMinutes: rules.cancelCutoffMinutes,
      })),
    );

    const when = `${ctx.resource.name}, ${input.pattern}, ${occ.length} bookings from ${fmt(occ[0].startsAt, "EEE d MMM")} at ${input.startTime}–${input.endTime}`;
    await notify(tx, outbox, [actor.id], {
      type: status === "pending" ? "booking_requested" : "booking_created",
      title: status === "pending" ? "Recurring request sent" : "Recurring booking confirmed",
      body: status === "pending" ? `Your request (${when}) is waiting for approval.` : `You booked ${when}.`,
      seriesId: s.id,
    });
    if (status === "pending") {
      await notify(tx, outbox, await adminIds(tx, actor.id), {
        type: "approval_needed",
        title: "New recurring booking request",
        body: `${actor.name} requested ${when}.`,
        seriesId: s.id,
      });
    }
    return { ...s, count: occ.length };
  });
  await sendMails(outbox);
  return series;
}

/** Cancel every future occurrence still allowed by the cut-off; report how many were too late. */
export async function cancelSeries(actor: Actor, seriesId: string) {
  const outbox: Mail[] = [];
  const result = await db.transaction(async (tx) => {
    const [s] = await tx.select().from(bookingSeries).where(eq(bookingSeries.id, seriesId));
    if (!s) throw new AppError("NOT_FOUND", "Series not found.");
    const now = new Date();
    const future = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.seriesId, seriesId), inArray(bookings.status, ["pending", "approved"]), gte(bookings.endsAt, now)))
      .for("update");
    if (!future.length) throw new AppError("CONFLICT", "There are no upcoming bookings left in this series.");

    const allowed = future.filter((b) => !cancelBlocker(actor, b, now));
    const tooLate = future.length - allowed.length;
    if (!allowed.length) throw new AppError(actor.id === s.userId ? "RULE_VIOLATION" : "FORBIDDEN", cancelBlocker(actor, future[0], now) ?? "Can't cancel.");

    await tx
      .update(bookings)
      .set({ status: "cancelled", cancelledBy: actor.id, cancelledAt: now })
      .where(inArray(bookings.id, allowed.map((b) => b.id)));

    const [r] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, s.resourceId));
    const wasPending = allowed.some((b) => b.status === "pending");
    await notify(tx, outbox, [s.userId], {
      type: "booking_cancelled",
      title: "Recurring booking cancelled",
      body: `${allowed.length} upcoming booking(s) of ${r.name} were cancelled${actor.id === s.userId ? "" : " by an admin"}${tooLate ? `; ${tooLate} too close to start to cancel` : ""}.`,
      seriesId,
    });
    if (actor.id === s.userId && wasPending) {
      await notify(tx, outbox, await adminIds(tx, actor.id), {
        type: "booking_cancelled",
        title: "Pending recurring request cancelled",
        body: `${actor.name} cancelled a pending recurring request for ${r.name}.`,
        seriesId,
      });
    }
    return { cancelled: allowed.length, tooLate };
  });
  await sendMails(outbox);
  return result;
}
