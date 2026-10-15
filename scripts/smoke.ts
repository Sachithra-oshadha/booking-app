// Integration checks against the real database for the rules that are easy to get wrong.
// Run after `npm run db:reset`:  npm run smoke
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { bookings, bookingSeries, resources, resourceTypes, user } from "../src/db/schema";
import { db, pool } from "../src/db";
import { toResult } from "../src/lib/errors";
import { addDays, fromLocal, isoDayOf, todayLocal } from "../src/lib/time";
import { decideBooking } from "../src/server/approvals";
import { cancelBooking, createBooking } from "../src/server/bookings";
import { setUserRole } from "../src/server/catalogue";
import { createSeries } from "../src/server/series";

const actor = (u: typeof user.$inferSelect) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const monday = (offsetWeeks: number) => {
  let d = addDays(todayLocal(), 7 * offsetWeeks);
  while (isoDayOf(d) !== 1) d = addDays(d, 1);
  return d;
};
let n = 0;
const ok = (label: string) => console.log(`  ✓ ${++n}. ${label}`);

async function main() {
  process.env.DISABLE_NOTIFICATIONS = "1";
  const users = await db.select().from(user);
  const [admin1, admin2] = users.filter((u) => u.role === "admin").map(actor);
  const [u1, u2] = users.filter((u) => u.role === "user").map(actor);
  const [room] = await db.select().from(resources).where(eq(resources.assetCode, "ROM-010")); // free of seeded bookings
  const [vehicle] = await db.select().from(resources).where(eq(resources.assetCode, "VEH-002")); // type requires approval
  const created: string[] = [];
  const seriesIds: string[] = [];
  const week = monday(30); // far in the future so nothing seeded collides

  try {
    // 1. a booking and a series occurrence that clashes with it -> nothing saved, clash reported
    const single = await createBooking(u1, { resourceId: room.id, startsAt: fromLocal(addDays(week, 14), "10:00"), endsAt: fromLocal(addDays(week, 14), "11:00") });
    created.push(single.id);
    const before = (await db.select().from(bookings).where(eq(bookings.resourceId, room.id))).length;
    const r = await toResult(() =>
      createSeries(u2, { resourceId: room.id, pattern: "weekly", startDate: week, occurrenceCount: 4, startTime: "10:00", endTime: "11:00" }),
    );
    assert.equal(r.ok, false);
    assert.equal((r as { details?: { clashes: unknown[] } }).details?.clashes.length, 1, "exactly one clashing date");
    assert.equal((await db.select().from(bookings).where(eq(bookings.resourceId, room.id))).length, before, "nothing saved");
    ok("series with one clash saves nothing and lists the clash");

    // 2. booking inside another booking's buffer is refused (room buffer 15 min: 11:00-11:15 is blocked)
    const inBuffer = await toResult(() => createBooking(u2, { resourceId: room.id, startsAt: fromLocal(addDays(week, 14), "11:00"), endsAt: fromLocal(addDays(week, 14), "12:00") }));
    assert.equal(inBuffer.ok, false);
    const after = await toResult(() => createBooking(u2, { resourceId: room.id, startsAt: fromLocal(addDays(week, 14), "11:30"), endsAt: fromLocal(addDays(week, 14), "12:00") }));
    assert.equal(after.ok, true);
    if (after.ok) created.push(after.data.id);
    ok("booking inside a buffer is refused; right after the buffer is fine");

    // 3. requires-approval resource: a user's booking is pending and blocks the slot; admins are auto-approved
    const pend = await createBooking(u1, { resourceId: vehicle.id, startsAt: fromLocal(addDays(week, 15), "09:00"), endsAt: fromLocal(addDays(week, 15), "10:00") });
    created.push(pend.id);
    assert.equal(pend.status, "pending");
    const clash = await toResult(() => createBooking(u2, { resourceId: vehicle.id, startsAt: fromLocal(addDays(week, 15), "09:30"), endsAt: fromLocal(addDays(week, 15), "10:30") }));
    assert.equal(clash.ok, false);
    ok("approval resource: user booking starts pending and blocks the slot");
    await decideBooking(admin1, pend.id, "approved");
    assert.equal((await db.select().from(bookings).where(eq(bookings.id, pend.id)))[0].status, "approved");
    ok("an admin approves the user's pending booking");
    for (const [i, a] of [admin1, admin2].entries()) {
      const mine = await createBooking(a, { resourceId: vehicle.id, startsAt: fromLocal(addDays(week, 17 + i), "09:00"), endsAt: fromLocal(addDays(week, 17 + i), "10:00") });
      created.push(mine.id);
      assert.equal(mine.status, "approved", `admin ${i + 1} single booking auto-approved`);
    }
    const ser = await createSeries(admin2, { resourceId: vehicle.id, pattern: "weekly", startDate: addDays(week, 21), occurrenceCount: 3, startTime: "09:00", endTime: "10:00" });
    const rows = await db.select().from(bookings).where(eq(bookings.seriesId, ser.id));
    created.push(...rows.map((r) => r.id));
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.status === "approved"), "admin series auto-approved");
    ok("admin bookings (both admins, single and recurring) are auto-approved");

    // 4. rejecting needs a note; rejected frees the slot
    const second = await createBooking(u1, { resourceId: vehicle.id, startsAt: fromLocal(addDays(week, 16), "09:00"), endsAt: fromLocal(addDays(week, 16), "10:00") });
    created.push(second.id);
    assert.equal((await toResult(() => decideBooking(admin1, second.id, "rejected"))).ok, false);
    await decideBooking(admin1, second.id, "rejected", "Not available");
    const retry = await createBooking(u2, { resourceId: vehicle.id, startsAt: fromLocal(addDays(week, 16), "09:00"), endsAt: fromLocal(addDays(week, 16), "10:00") });
    created.push(retry.id);
    ok("rejection needs a note and frees the slot");

    // 5. cancel cut-off: user blocked inside the cut-off, admin allowed; later rule change doesn't touch snapshot
    const soon = await db
      .insert(bookings)
      .values({ resourceId: room.id, userId: u1.id, startsAt: new Date(Date.now() + 20 * 60_000), endsAt: new Date(Date.now() + 80 * 60_000), blockedUntil: new Date(Date.now() + 95 * 60_000), status: "approved", bufferMinutes: 15, cancelCutoffMinutes: 60 })
      .returning();
    created.push(soon[0].id);
    assert.equal((await toResult(() => cancelBooking(u1, soon[0].id))).ok, false);
    assert.equal((await toResult(() => cancelBooking(admin1, soon[0].id))).ok, true);
    ok("user can't cancel inside the cut-off, admin can");

    const [type] = await db.select().from(resourceTypes).where(eq(resourceTypes.slug, "room"));
    await db.update(resourceTypes).set({ bufferMinutes: 60 }).where(eq(resourceTypes.id, type.id));
    const [snap] = await db.select().from(bookings).where(eq(bookings.id, single.id));
    assert.equal(snap.bufferMinutes, 15);
    await db.update(resourceTypes).set({ bufferMinutes: type.bufferMinutes }).where(eq(resourceTypes.id, type.id));
    ok("changing a type's buffer leaves existing bookings untouched");

    // 6. last-admin guard
    assert.equal((await toResult(() => setUserRole(admin1, admin1.id, "user"))).ok, true, "demoting one of two admins is fine");
    assert.equal((await toResult(() => setUserRole(admin2, admin2.id, "user"))).ok, false, "demoting the last admin is refused");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, admin1.id));
    ok("last admin cannot be demoted");
  } finally {
    const sids = await db.select({ id: bookings.seriesId }).from(bookings).where(inArray(bookings.id, created));
    seriesIds.push(...sids.map((s) => s.id!).filter(Boolean));
    await db.delete(bookings).where(and(inArray(bookings.id, created)));
    if (seriesIds.length) await db.delete(bookingSeries).where(inArray(bookingSeries.id, seriesIds));
  }
  console.log(`\nPASS: ${n} checks`);
}

main()
  .catch((e) => {
    console.error("FAIL:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
