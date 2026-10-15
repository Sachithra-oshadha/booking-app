import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, resources, resourceTypes } from "@/db/schema";
import { validateSlot, type Rules } from "@/lib/slot";
import { DAY_NAMES, fmt, localParts, minutesToTime } from "@/lib/time";
import { descendantIds, listLocations } from "./locations";
import { getGlobalSettings, resolveRules } from "./rules";

export type ResourceListItem = {
  id: string;
  assetCode: string;
  name: string;
  status: "active" | "maintenance" | "retired";
  capacity: number | null;
  typeId: string;
  typeName: string;
  locationId: string;
  locationPath: string;
  rules: Rules;
};

/**
 * What a user can do with a resource right now. Replaces the old pair of badges
 * ("Active" + "Free now / In use / closed"): one state, always with a time.
 *   available  open and not booked now        note: "Free until 15:00"
 *   booked     open, someone has it now       note: "Free from 14:30"
 *   closed     outside working hours/days     note: "Opens tomorrow 08:00"
 *   out        maintenance or retired         note: "Under maintenance"
 */
export type LiveStateKey = "available" | "booked" | "closed" | "out";
export type LiveState = { state: LiveStateKey; note: string };
export const STATE_ORDER: Record<LiveStateKey, number> = { available: 0, booked: 1, closed: 2, out: 3 };

/** Every resource with its type, location path and resolved rules. A few hundred rows at most, so filtering happens in TS. */
// ponytail: loads all resources; push filters into SQL if the catalogue grows past a few thousand.
export async function loadResources(): Promise<ResourceListItem[]> {
  const [rows, locs, g] = await Promise.all([
    db
      .select({ resource: resources, type: resourceTypes })
      .from(resources)
      .innerJoin(resourceTypes, eq(resources.typeId, resourceTypes.id))
      .orderBy(asc(resources.assetCode)),
    listLocations(),
    getGlobalSettings(),
  ]);
  const path = new Map(locs.map((l) => [l.id, l.path]));
  return rows.map(({ resource: r, type: t }) => ({
    id: r.id,
    assetCode: r.assetCode,
    name: r.name,
    status: r.status,
    capacity: r.capacity,
    typeId: t.id,
    typeName: t.name,
    locationId: r.locationId,
    locationPath: path.get(r.locationId) ?? "",
    rules: resolveRules(r, t, g),
  }));
}

function nextOpening(rules: Rules, isoDay: number, minutes: number): string {
  const at = minutesToTime(rules.workStartMin);
  if (rules.workingDays.includes(isoDay) && minutes < rules.workStartMin) return `Opens today ${at}`;
  for (let i = 1; i <= 7; i++) {
    const d = ((isoDay - 1 + i) % 7) + 1;
    if (rules.workingDays.includes(d)) return `Opens ${i === 1 ? "tomorrow" : DAY_NAMES[d]} ${at}`;
  }
  return "No working days set";
}

/** Live state for each resource, from its rules and the pending/approved bookings in the next 24 hours. */
async function liveStates(items: ResourceListItem[]): Promise<Map<string, LiveState>> {
  const now = new Date();
  const t = now.getTime();
  const { minutes, isoDay } = localParts(now);
  const rows = await db
    .select({ resourceId: bookings.resourceId, startsAt: bookings.startsAt, blockedUntil: bookings.blockedUntil })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["pending", "approved"]),
        sql`${bookings.blockedUntil} > ${now}`,
        sql`${bookings.startsAt} < ${new Date(t + 24 * 3600_000)}`,
      ),
    )
    .orderBy(asc(bookings.startsAt));
  const byRes = new Map<string, { s: number; e: number }[]>();
  for (const b of rows) {
    const list = byRes.get(b.resourceId) ?? [];
    list.push({ s: b.startsAt.getTime(), e: b.blockedUntil.getTime() });
    byRes.set(b.resourceId, list);
  }

  const out = new Map<string, LiveState>();
  for (const r of items) {
    if (r.status !== "active") {
      out.set(r.id, { state: "out", note: r.status === "maintenance" ? "Under maintenance" : "Retired" });
      continue;
    }
    const open = r.rules.workingDays.includes(isoDay) && minutes >= r.rules.workStartMin && minutes < r.rules.workEndMin;
    if (!open) {
      out.set(r.id, { state: "closed", note: nextOpening(r.rules, isoDay, minutes) });
      continue;
    }
    const closeAt = t + (r.rules.workEndMin - minutes) * 60_000;
    const list = byRes.get(r.id) ?? [];
    const current = list.find((b) => b.s <= t && b.e > t);
    if (current) {
      // back-to-back bookings: follow the chain to the first real gap (list is sorted by start)
      let end = current.e;
      for (const b of list) if (b.s <= end && b.e > end) end = b.e;
      out.set(r.id, { state: "booked", note: end >= closeAt ? "Booked until closing" : `Free from ${fmt(new Date(end), "HH:mm")}` });
      continue;
    }
    const next = list.find((b) => b.s > t);
    out.set(r.id, {
      state: "available",
      note: next && next.s < closeAt ? `Free until ${fmt(new Date(next.s), "HH:mm")}` : `Free until closing, ${minutesToTime(r.rules.workEndMin)}`,
    });
  }
  return out;
}

export type ResourceFilters = { q?: string; typeId?: string; locationId?: string; status?: string; availableNow?: boolean; state?: LiveStateKey };

export async function listResources(f: ResourceFilters) {
  let items = await loadResources();
  if (f.typeId) items = items.filter((r) => r.typeId === f.typeId);
  if (f.status) items = items.filter((r) => r.status === f.status);
  if (f.locationId && /^[0-9a-f-]{36}$/i.test(f.locationId)) {
    const ids = new Set(await descendantIds(f.locationId));
    items = items.filter((r) => ids.has(r.locationId));
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    items = items.filter((r) => `${r.name} ${r.assetCode}`.toLowerCase().includes(q));
  }
  const live = await liveStates(items);
  let out = items.map((r) => {
    const l = live.get(r.id)!;
    return { ...r, live: l, freeNow: l.state === "available" };
  });
  if (f.availableNow) out = out.filter((r) => r.freeNow);
  if (f.state) out = out.filter((r) => r.live.state === f.state);
  return out;
}

export type ResourceWithLive = Awaited<ReturnType<typeof listResources>>[number];

/**
 * Active resources whose rules allow [start, end) and that have no pending/approved booking overlapping
 * [start, end + that resource's buffer). SQL narrows by overlap, validateSlot applies the rules.
 */
export async function findFree(f: { start: Date; end: Date; typeId?: string; locationId?: string }) {
  const locIds = f.locationId ? await descendantIds(f.locationId) : null;
  const clash = await db
    .select({ id: bookings.resourceId })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["pending", "approved"]),
        sql`${bookings.startsAt} < ${f.end}`,
        sql`${bookings.blockedUntil} > ${f.start}`,
      ),
    );
  const all = await loadResources();
  const busy = new Set(clash.map((c) => c.id));
  // A resource with its own buffer also blocks when f.end + buffer reaches an existing booking.
  const nearStart = await db
    .select({ id: bookings.resourceId, startsAt: bookings.startsAt })
    .from(bookings)
    .where(and(inArray(bookings.status, ["pending", "approved"]), sql`${bookings.startsAt} >= ${f.end}`, sql`${bookings.startsAt} < ${new Date(f.end.getTime() + 24 * 3600_000)}`));
  const out = all.filter((r) => {
    if (r.status !== "active") return false;
    if (f.typeId && r.typeId !== f.typeId) return false;
    if (locIds && !locIds.includes(r.locationId)) return false;
    if (busy.has(r.id)) return false;
    const blockedEnd = f.end.getTime() + r.rules.bufferMinutes * 60_000;
    if (nearStart.some((n) => n.id === r.id && n.startsAt.getTime() < blockedEnd)) return false;
    return validateSlot(r.rules, f.start, f.end).length === 0;
  });
  return out;
}
