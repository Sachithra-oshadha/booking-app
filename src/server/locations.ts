import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { locations, resources } from "@/db/schema";
import { AppError } from "@/lib/errors";

export const KINDS = ["site", "building", "floor", "area"] as const;
type Kind = (typeof KINDS)[number];

export type LocationRow = typeof locations.$inferSelect & { path: string; depth: number };

/** All locations, depth-first (parents before children), each with a "Site › Building › Floor" path. */
export async function listLocations(): Promise<LocationRow[]> {
  const all = await db.select().from(locations);
  const byParent = new Map<string | null, typeof all>();
  for (const l of all) byParent.set(l.parentId, [...(byParent.get(l.parentId) ?? []), l]);
  const out: LocationRow[] = [];
  const walk = (parent: string | null, prefix: string, depth: number) => {
    for (const l of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
      const path = prefix ? `${prefix} › ${l.name}` : l.name;
      out.push({ ...l, path, depth });
      walk(l.id, path, depth + 1);
    }
  };
  walk(null, "", 0);
  return out;
}

/** A location plus all its descendants (recursive CTE). */
export async function descendantIds(locationId: string): Promise<string[]> {
  const r = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM locations WHERE id = ${locationId}
      UNION ALL
      SELECT l.id FROM locations l JOIN tree t ON l.parent_id = t.id
    ) SELECT id FROM tree`);
  return r.rows.map((x) => x.id);
}

async function checkParent(kind: Kind, parentId?: string) {
  const idx = KINDS.indexOf(kind);
  if (idx === 0) {
    if (parentId) throw new AppError("VALIDATION", "A site has no parent.", { fieldErrors: { parentId: "A site has no parent" } });
    return;
  }
  if (!parentId) throw new AppError("VALIDATION", `A ${kind} needs a parent ${KINDS[idx - 1]}.`, { fieldErrors: { parentId: "Required" } });
  const [p] = await db.select().from(locations).where(eq(locations.id, parentId));
  if (!p || p.kind !== KINDS[idx - 1])
    throw new AppError("VALIDATION", `The parent of a ${kind} must be a ${KINDS[idx - 1]}.`, { fieldErrors: { parentId: `Must be a ${KINDS[idx - 1]}` } });
}

export async function createLocation(input: { name: string; kind: Kind; parentId?: string }) {
  await checkParent(input.kind, input.parentId);
  await db.insert(locations).values({ name: input.name, kind: input.kind, parentId: input.parentId ?? null });
}

export async function updateLocation(id: string, input: { name: string }) {
  await db.update(locations).set({ name: input.name }).where(eq(locations.id, id));
}

export async function deleteLocation(id: string) {
  const [child] = await db.select({ id: locations.id }).from(locations).where(eq(locations.parentId, id)).limit(1);
  if (child) throw new AppError("CONFLICT", "This location still has child locations.");
  const [res] = await db.select({ id: resources.id }).from(resources).where(eq(resources.locationId, id)).limit(1);
  if (res) throw new AppError("CONFLICT", "This location still has resources.");
  await db.delete(locations).where(eq(locations.id, id));
}
