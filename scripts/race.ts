// Fires identical booking requests at the same instant and asserts exactly one succeeds.
// The database exclusion constraint (not app code) is what makes this hold.
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { bookings, resources, user } from "../src/db/schema";
import { db, pool } from "../src/db";
import { toResult } from "../src/lib/errors";
import { addDays, fromLocal, isoDayOf, todayLocal } from "../src/lib/time";
import { createBooking } from "../src/server/bookings";

async function main() {
  process.env.DISABLE_NOTIFICATIONS = "1";
  const people = await db.select().from(user).where(eq(user.role, "user"));
  assert.ok(people.length >= 2, "run `npm run db:seed` first");
  const actors = people.map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role }));
  const [room] = await db.select().from(resources).where(eq(resources.assetCode, "ROM-006"));

  let date = addDays(todayLocal(), 60);
  while (isoDayOf(date) > 5) date = addDays(date, 1);
  const input = { resourceId: room.id, startsAt: fromLocal(date, "14:00"), endsAt: fromLocal(date, "15:00") };

  const N = 6;
  const results = await Promise.all(Array.from({ length: N }, (_, i) => toResult(() => createBooking(actors[i % actors.length], input))));
  const wins = results.filter((r) => r.ok);
  results.forEach((r, i) => console.log(`request ${i + 1}:`, r.ok ? "OK (booked)" : `rejected: ${r.error}`));

  // clean up so the script is repeatable
  const ids = wins.map((w) => (w.ok ? w.data.id : "")).filter(Boolean);
  if (ids.length) await db.delete(bookings).where(inArray(bookings.id, ids));

  assert.equal(wins.length, 1, `expected exactly 1 success, got ${wins.length}`);
  console.log(`\nPASS: ${N} simultaneous requests, exactly 1 succeeded.`);
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
