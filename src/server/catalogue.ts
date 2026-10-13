import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, globalSettings, resources, resourceTypes, user } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { ADMIN_ROLE, PERMISSIONS, type Actor } from "./permissions";

type Rules = ReturnType<typeof import("@/lib/validation").parseRules>;

// ---------- global settings ----------
export async function updateGlobalSettings(rules: Rules) {
  await db
    .update(globalSettings)
    .set({ ...(rules as typeof globalSettings.$inferInsert), updatedAt: new Date() })
    .where(eq(globalSettings.id, 1));
}

// ---------- resource types ----------
export async function createType(input: { name: string; slug: string }, rules: Rules) {
  await db.insert(resourceTypes).values({ ...input, ...rules });
}
export async function updateType(id: string, input: { name: string; slug: string }, rules: Rules) {
  await db.update(resourceTypes).set({ ...input, ...rules }).where(eq(resourceTypes.id, id));
}
/** Fails with CONFLICT (FK 23503) while resources still use the type. */
export async function deleteType(id: string) {
  await db.delete(resourceTypes).where(eq(resourceTypes.id, id));
}

// ---------- resources ----------
type ResourceInput = {
  assetCode: string;
  name: string;
  typeId: string;
  locationId: string;
  description?: string;
  capacity?: number;
  make?: string;
  model?: string;
  serialNumber?: string;
  status: "active" | "maintenance" | "retired";
};

const clean = (i: ResourceInput) => ({
  ...i,
  description: i.description ?? null,
  capacity: i.capacity ?? null,
  make: i.make ?? null,
  model: i.model ?? null,
  serialNumber: i.serialNumber ?? null,
});

export const upcomingBookingCount = async (resourceId: string) => {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.resourceId, resourceId), inArray(bookings.status, ["pending", "approved"]), gt(bookings.endsAt, new Date())));
  return r.n;
};

export async function createResource(input: ResourceInput, rules: Rules) {
  await db.insert(resources).values({ ...clean(input), ...rules });
}

/** Returns the number of upcoming bookings when the resource leaves `active` (they are NOT auto-cancelled). */
export async function updateResource(id: string, input: ResourceInput, rules: Rules) {
  await db.update(resources).set({ ...clean(input), ...rules, updatedAt: new Date() }).where(eq(resources.id, id));
  return input.status === "active" ? 0 : upcomingBookingCount(id);
}

/** Resources with bookings are retired, never deleted. */
export async function retireResource(id: string) {
  await db.update(resources).set({ status: "retired", updatedAt: new Date() }).where(eq(resources.id, id));
  return upcomingBookingCount(id);
}

// ---------- users ----------
export const listUsers = () =>
  db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }).from(user).orderBy(user.name);

/** Last-admin guard: lock the admin rows first so two concurrent demotions can't both pass the count check. */
export async function setUserRole(actor: Actor, userId: string, role: string) {
  if (!(role in PERMISSIONS)) throw new AppError("VALIDATION", "Unknown role.");
  await db.transaction(async (tx) => {
    const admins = await tx.select({ id: user.id }).from(user).where(eq(user.role, ADMIN_ROLE)).for("update");
    const [target] = await tx.select().from(user).where(eq(user.id, userId));
    if (!target) throw new AppError("NOT_FOUND", "User not found.");
    const demoting = target.role === ADMIN_ROLE && role !== ADMIN_ROLE;
    if (demoting && admins.length <= 1) throw new AppError("CONFLICT", "You can't demote the last admin.");
    await tx.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
  });
  return actor.id === userId;
}
