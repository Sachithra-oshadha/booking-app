import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./index";
import { account, bookings, locations, notifications, resources, resourceTypes, user } from "./schema";
import { toResult } from "@/lib/errors";
import { addDays, fromLocal, isoDayOf, todayLocal } from "@/lib/time";
import { decideBooking } from "@/server/approvals";
import { cancelBooking, createBooking, minutes } from "@/server/bookings";
import { createSeries } from "@/server/series";
import { getEffectiveRules } from "@/server/rules";
import type { Actor } from "@/server/permissions";

const PASSWORD = "Password123!";

/** Next working (Mon–Fri) date at least `offset` days from today, local. */
function workday(offset: number, dir: 1 | -1 = 1) {
  let d = addDays(todayLocal(), offset * dir);
  while (isoDayOf(d) > 5) d = addDays(d, dir);
  return d;
}
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

async function main() {
  process.env.DISABLE_NOTIFICATIONS = "1"; // seed data goes through the real services, silently
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(user);
  if (n > 0) {
    console.log("Database already has users; run `npm run db:reset` for a clean seed.");
    return;
  }

  // ---------- users ----------
  const hash = await hashPassword(PASSWORD);
  const people = [
    ["Alex Admin", "admin1@demo.com", "admin"],
    ["Priya Admin", "admin2@demo.com", "admin"],
    ["Nimal Perera", "user1@demo.com", "user"],
    ["Sara Fernando", "user2@demo.com", "user"],
    ["Kavindu Silva", "user3@demo.com", "user"],
    ["Dilini Jayasuriya", "user4@demo.com", "user"],
  ] as const;
  const actors: Actor[] = [];
  for (const [name, email, role] of people) {
    const id = crypto.randomUUID();
    await db.insert(user).values({ id, name, email, role, emailVerified: true });
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
    actors.push({ id, name, email, role });
  }
  const [admin1, admin2, ...users] = actors;

  // ---------- global settings: Mon–Fri 08:00–18:00 etc. are already seeded by the migration ----------

  // ---------- resource types ----------
  const typeDefs = [
    { name: "Room", slug: "room", minSlotMinutes: 30, maxDurationMinutes: 240, bufferMinutes: 15, cancelCutoffMinutes: 60 },
    { name: "Vehicle", slug: "vehicle", minSlotMinutes: 30, maxDurationMinutes: 480, bufferMinutes: 30, cancelCutoffMinutes: 30, requiresApproval: true },
    { name: "Equipment", slug: "equipment", minSlotMinutes: 30, maxDurationMinutes: 480, bufferMinutes: 15, cancelCutoffMinutes: 60 },
    { name: "Tool", slug: "tool", minSlotMinutes: 30, maxDurationMinutes: 240, bufferMinutes: 0, cancelCutoffMinutes: 30 },
  ];
  const types = await db.insert(resourceTypes).values(typeDefs).returning();
  const typeBySlug = Object.fromEntries(types.map((t) => [t.slug, t.id]));

  // ---------- locations: 2 sites -> 5 buildings each -> 2 floors -> 1-2 areas ----------
  const areas: string[] = [];
  const siteNames = ["Colombo HQ", "Kandy Campus"];
  const buildingNames = [
    ["Main Block", "Annex", "Innovation Hub", "Workshop", "Logistics Centre"],
    ["Admin Building", "Lab Block", "Training Centre", "Garage", "Warehouse"],
  ];
  for (let s = 0; s < 2; s++) {
    const [site] = await db.insert(locations).values({ name: siteNames[s], kind: "site" }).returning();
    for (const bName of buildingNames[s]) {
      const [b] = await db.insert(locations).values({ name: bName, kind: "building", parentId: site.id }).returning();
      for (let f = 1; f <= 2; f++) {
        const [fl] = await db.insert(locations).values({ name: `Floor ${f}`, kind: "floor", parentId: b.id }).returning();
        const [a1] = await db.insert(locations).values({ name: f === 1 ? "East wing" : "West wing", kind: "area", parentId: fl.id }).returning();
        areas.push(a1.id);
        if (f === 1) areas.push((await db.insert(locations).values({ name: "Reception area", kind: "area", parentId: fl.id }).returning())[0].id);
      }
    }
  }

  // ---------- resources: 15 per type ----------
  const names: Record<string, [string, string?, string?][]> = {
    room: ["Boardroom", "Meeting Room A", "Meeting Room B", "Meeting Room C", "Training Room 1", "Training Room 2", "Huddle Space 1", "Huddle Space 2", "Interview Room", "Conference Hall", "Brainstorm Room", "Quiet Room", "Client Lounge", "Design Studio", "War Room"].map((n) => [n]),
    vehicle: [["Toyota HiAce", "Toyota", "HiAce"], ["Toyota Prius", "Toyota", "Prius"], ["Nissan Caravan", "Nissan", "Caravan"], ["Suzuki Every", "Suzuki", "Every"], ["Isuzu D-Max", "Isuzu", "D-Max"], ["Honda Vezel", "Honda", "Vezel"], ["Toyota Aqua", "Toyota", "Aqua"], ["Mitsubishi L200", "Mitsubishi", "L200"], ["Toyota Hilux", "Toyota", "Hilux"], ["Tata Ace", "Tata", "Ace"], ["Mazda BT-50", "Mazda", "BT-50"], ["Toyota Coaster", "Toyota", "Coaster"], ["Nissan Leaf", "Nissan", "Leaf"], ["Suzuki Alto", "Suzuki", "Alto"], ["Ford Ranger", "Ford", "Ranger"]],
    equipment: [["Projector", "Epson", "EB-X49"], ["Portable Projector", "BenQ", "GV30"], ["DSLR Camera", "Canon", "EOS 90D"], ["Mirrorless Camera", "Sony", "A7 III"], ["Conference Speaker", "Jabra", "Speak 750"], ["PA System", "Yamaha", "Stagepas 400"], ["3D Printer", "Prusa", "MK4"], ["Laptop Pool 1", "Dell", "Latitude 5440"], ["Laptop Pool 2", "Dell", "Latitude 5440"], ["Drone", "DJI", "Mavic 3"], ["Tripod Kit", "Manfrotto", "190X"], ["Whiteboard Cart", "Quartet", "Mobile"], ["Label Printer", "Brother", "QL-820"], ["Soldering Station", "Weller", "WE1010"], ["Oscilloscope", "Rigol", "DS1054Z"]],
    tool: ["Cordless Drill", "Impact Driver", "Angle Grinder", "Circular Saw", "Jigsaw", "Orbital Sander", "Heat Gun", "Torque Wrench", "Multimeter", "Laser Level", "Pressure Washer", "Ladder 3m", "Ladder 5m", "Rotary Hammer", "Tool Cart"].map((n) => [n]),
  };
  const prefix: Record<string, string> = { room: "ROM", vehicle: "VEH", equipment: "EQP", tool: "TOL" };
  const created: { id: string; slug: string; i: number }[] = [];
  let loc = 0;
  for (const slug of Object.keys(names)) {
    for (let i = 0; i < 15; i++) {
      const [name, make, model] = names[slug][i];
      const [r] = await db
        .insert(resources)
        .values({
          assetCode: `${prefix[slug]}-${pad(i + 1).padStart(3, "0")}`,
          name,
          typeId: typeBySlug[slug],
          locationId: areas[loc++ % areas.length],
          capacity: slug === "room" ? [12, 8, 8, 6, 20, 20, 4, 4, 4, 80, 10, 2, 8, 12, 6][i] : null,
          make: make ?? null,
          model: model ?? null,
          serialNumber: make ? `SN-${prefix[slug]}${pad(i + 1)}${(i * 7919 + 1000) % 9999}` : null,
          description: slug === "room" ? `Bookable ${name.toLowerCase()} with a display and whiteboard.` : null,
        })
        .returning({ id: resources.id });
      created.push({ id: r.id, slug, i });
    }
  }
  const byCode = async (code: string) => (await db.select().from(resources).where(eq(resources.assetCode, code)))[0];
  // a few overrides
  await db.update(resources).set({ requiresApproval: true, maxDurationMinutes: 120 }).where(eq(resources.assetCode, "ROM-001")); // Boardroom
  await db.update(resources).set({ workingDays: [1, 2, 3, 4, 5, 6], workEnd: "13:00" }).where(eq(resources.assetCode, "EQP-007")); // 3D printer, Saturday mornings
  await db.update(resources).set({ maxDurationMinutes: 240, requiresApproval: false }).where(eq(resources.assetCode, "VEH-014")); // Alto: small car, no approval
  await db.update(resources).set({ bufferMinutes: 15 }).where(eq(resources.assetCode, "TOL-011")); // Pressure washer
  // statuses
  await db.update(resources).set({ status: "maintenance" }).where(sql`${resources.assetCode} in ('VEH-003','EQP-010','ROM-012')`);
  await db.update(resources).set({ status: "retired" }).where(eq(resources.assetCode, "TOL-015"));

  // ---------- recurring series (through the service) ----------
  const boardroom = await byCode("ROM-002");
  const weekdayDate = (offset: number, weekday: number) => {
    let d = addDays(todayLocal(), offset);
    while (isoDayOf(d) !== weekday) d = addDays(d, 1);
    return d;
  };
  await createSeries(users[0], { resourceId: boardroom.id, pattern: "weekly", startDate: weekdayDate(2, 2), occurrenceCount: 6, startTime: "10:00", endTime: "11:00", purpose: "Weekly team sync" });
  const van = await byCode("VEH-001");
  await createSeries(users[1], { resourceId: van.id, pattern: "weekly", startDate: weekdayDate(3, 4), occurrenceCount: 4, startTime: "08:00", endTime: "12:00", purpose: "Fortnightly site visits" });
  const cart = await byCode("TOL-014");
  await createSeries(users[2], { resourceId: cart.id, pattern: "daily", startDate: workday(2), occurrenceCount: 5, startTime: "13:00", endTime: "15:00", purpose: "Workshop refit" });

  // ---------- one upcoming booking per active resource ----------
  const active = await db.select().from(resources).where(eq(resources.status, "active"));
  const singles: { id: string; byUser: Actor }[] = [];
  for (let k = 0; k < active.length; k++) {
    const r = active[k];
    const who = users[k % users.length];
    // try successive start hours until the slot is free of series/overrides
    for (let attempt = 0; attempt < 8; attempt++) {
      const date = workday(1 + (k % 12));
      const startMin = (9 + ((k + attempt) % 7)) * 60;
      const res = await toResult(() =>
        createBooking(who, { resourceId: r.id, startsAt: fromLocal(date, hhmm(startMin)), endsAt: fromLocal(date, hhmm(startMin + 60)), purpose: ["Client workshop", "Team planning", "Site inspection", "Training session", "Maintenance prep", "Field work"][k % 6] }),
      );
      if (res.ok) {
        singles.push({ id: res.data.id, byUser: who });
        break;
      }
    }
  }

  // ---------- approvals / rejections / cancellations through the services ----------
  const pending = await db.select().from(bookings).where(eq(bookings.status, "pending"));
  const pendingSingles = pending.filter((b) => !b.seriesId);
  for (const [i, b] of pendingSingles.entries()) {
    if (i % 3 === 0) await decideBooking(admin1, b.id, "approved");
    else if (i % 3 === 1 && i < 8) await decideBooking(admin2, b.id, "rejected", "Vehicle is reserved for another team that day.");
    // the rest stay pending for the approvals queue
  }
  const lateApprovals = await db.select().from(bookings).where(eq(bookings.status, "approved"));
  for (const b of lateApprovals.filter((x) => !x.seriesId).slice(0, 4)) {
    await cancelBooking({ ...users.find((u) => u.id === b.userId)!, role: "user" }, b.id);
  }

  // ---------- past bookings: direct inserts (the services refuse past start times) ----------
  const pastTargets = active.slice(0, 18);
  for (const [k, r] of pastTargets.entries()) {
    const ctx = (await getEffectiveRules(r.id))!;
    const date = workday(2 + k, -1);
    const startsAt = fromLocal(date, hhmm((9 + (k % 6)) * 60));
    const endsAt = new Date(startsAt.getTime() + minutes(60));
    const expiredPending = ctx.rules.requiresApproval && k % 2 === 0;
    await db.insert(bookings).values({
      resourceId: r.id,
      userId: users[k % users.length].id,
      purpose: "Past booking",
      startsAt,
      endsAt,
      blockedUntil: new Date(endsAt.getTime() + minutes(ctx.rules.bufferMinutes)),
      status: expiredPending ? "pending" : "approved",
      bufferMinutes: ctx.rules.bufferMinutes,
      cancelCutoffMinutes: ctx.rules.cancelCutoffMinutes,
      decidedBy: expiredPending ? null : admin1.id,
      decidedAt: expiredPending ? null : new Date(startsAt.getTime() - minutes(24 * 60)),
    });
  }

  // ---------- notifications ----------
  for (const [i, u] of actors.entries()) {
    await db.insert(notifications).values([
      { userId: u.id, type: "info", title: "Welcome to the booking app", body: "Browse resources, book a slot and track approvals here." },
      { userId: u.id, type: "info", title: i < 2 ? "Approvals waiting" : "Remember to cancel early", body: i < 2 ? "Some booking requests are waiting in the approvals queue." : "Bookings can be cancelled until the cut-off before they start." },
      { userId: u.id, type: "info", title: "Seed notification", body: "Marked as read in the seed data.", readAt: new Date() },
    ]);
  }

  const counts = await db.execute(sql`select (select count(*) from resources) r, (select count(*) from bookings) b, (select count(*) from booking_series) s`);
  console.log("Seeded:", counts.rows[0], `\nLogin with admin1@demo.com / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
