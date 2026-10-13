import { eq } from "drizzle-orm";
import { db, type Db, type Tx } from "@/db";
import { globalSettings, resources, resourceTypes } from "@/db/schema";
import type { Rules } from "@/lib/slot";
import { timeToMinutes } from "@/lib/time";

export type Executor = Db | Tx;

type RuleRow = {
  workingDays: number[] | null;
  workStart: string | null;
  workEnd: string | null;
  minSlotMinutes: number | null;
  maxDurationMinutes: number | null;
  bufferMinutes: number | null;
  cancelCutoffMinutes: number | null;
  requiresApproval: boolean | null;
};

/** Per rule: resource override ?? resource type default ?? global default. The only place this chain lives. */
export function resolveRules(resource: RuleRow, type: RuleRow, global: Required<{ [K in keyof RuleRow]: NonNullable<RuleRow[K]> }>): Rules {
  return {
    workingDays: resource.workingDays ?? type.workingDays ?? global.workingDays,
    workStartMin: timeToMinutes(resource.workStart ?? type.workStart ?? global.workStart),
    workEndMin: timeToMinutes(resource.workEnd ?? type.workEnd ?? global.workEnd),
    minSlotMinutes: resource.minSlotMinutes ?? type.minSlotMinutes ?? global.minSlotMinutes,
    maxDurationMinutes: resource.maxDurationMinutes ?? type.maxDurationMinutes ?? global.maxDurationMinutes,
    bufferMinutes: resource.bufferMinutes ?? type.bufferMinutes ?? global.bufferMinutes,
    cancelCutoffMinutes: resource.cancelCutoffMinutes ?? type.cancelCutoffMinutes ?? global.cancelCutoffMinutes,
    requiresApproval: resource.requiresApproval ?? type.requiresApproval ?? global.requiresApproval,
  };
}

export async function getGlobalSettings(ex: Executor = db) {
  const [g] = await ex.select().from(globalSettings).where(eq(globalSettings.id, 1));
  return g;
}

/** Resource + its type + fully resolved rules, or null when the resource doesn't exist. */
export async function getEffectiveRules(resourceId: string, ex: Executor = db) {
  const [row] = await ex
    .select({ resource: resources, type: resourceTypes })
    .from(resources)
    .innerJoin(resourceTypes, eq(resources.typeId, resourceTypes.id))
    .where(eq(resources.id, resourceId));
  if (!row) return null;
  const g = await getGlobalSettings(ex);
  return { ...row, rules: resolveRules(row.resource, row.type, g) };
}

const NONE: RuleRow = {
  workingDays: null,
  workStart: null,
  workEnd: null,
  minSlotMinutes: null,
  maxDurationMinutes: null,
  bufferMinutes: null,
  cancelCutoffMinutes: null,
  requiresApproval: null,
};

/** What a blank (inherit) field falls back to: the type's value, else the global default. Used for form placeholders. */
export async function inheritedRules(type: RuleRow | null = null) {
  return resolveRules(NONE, type ?? NONE, await getGlobalSettings());
}
