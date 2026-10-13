import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, resources, resourceTypes } from "@/db/schema";
import { validateSlot, type Rules } from "@/lib/slot";
import { localParts } from "@/lib/time";
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

/** Ids of active resources that are open right now and have no pending/approved booking covering now. */
async function availableNowIds(items: ResourceListItem[]): Promise<Set<string>> {
  const now = new Date();
  const busy = await db
    .select({ resourceId: bookings.resourceId })
    .from(bookings)
    .where(and(inArray(bookings.status, ["pending", "approved"]), sql`${bookings.startsAt} <= ${now} AND ${bookings.blockedUntil} > ${now}`));
  const busyIds = new Set(busy.map((b) => b.resourceId));
  const { minutes, isoDay } = localParts(now);
  return new Set(
    items
      .filter((r) => r.status === "active" && !busyIds.has(r.id) && r.rules.workingDays.includes(isoDay) && minutes >= r.rules.workStartMin && minutes < r.rules.workEndMin)
      .map((r) => r.id),
  );
}

export type ResourceFilters = { q?: string; typeId?: string; locationId?: string; status?: string; availableNow?: boolean };

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
  const free = await availableNowIds(items);
  if (f.availableNow) items = items.filter((r) => free.has(r.id));
  return items.map((r) => ({ ...r, freeNow: free.has(r.id) }));
}

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
