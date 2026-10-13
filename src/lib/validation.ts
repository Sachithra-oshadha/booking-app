import { z } from "zod";
import { AppError } from "./errors";

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
export const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time");
const uuid = z.string().uuid();

/** FormData -> plain object. Blank -> undefined, repeated keys -> array. */
export function formObject(fd: FormData): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = all.length > 1 ? all : all[0] === "" ? undefined : all[0];
  }
  return out;
}

export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[String(i.path[0] ?? "_")] ??= i.message;
  throw new AppError("VALIDATION", Object.values(fieldErrors)[0] ?? "Invalid input", { fieldErrors });
}

// ---------- bookings ----------
const purpose = z.string().max(500).optional();

export const bookingInput = z.object({
  resourceId: uuid,
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr,
  purpose,
});

export const seriesInput = bookingInput
  .omit({ date: true })
  .extend({
    pattern: z.enum(["daily", "weekly"]),
    startDate: dateStr,
    untilDate: dateStr.optional(),
    occurrenceCount: z.coerce.number().int().min(1).max(52, "At most 52 occurrences").optional(),
  })
  .refine((v) => !!v.untilDate !== !!v.occurrenceCount, {
    message: "Choose either an end date or a number of occurrences",
    path: ["untilDate"],
  })
  .refine((v) => !v.untilDate || v.untilDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["untilDate"],
  });

export const decisionInput = z.object({ id: uuid, note: z.string().max(500).optional() });

const localDateTime = (msg: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, msg);
export const findFreeInput = z.object({
  start: localDateTime("Pick a start"),
  end: localDateTime("Pick an end"),
  typeId: uuid.optional(),
  locationId: uuid.optional(),
});

// ---------- rules (settings / types / resources) ----------
const asArray = (v: unknown) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const int = (label: string, min = 0) =>
  z.coerce.number({ error: `${label} must be a number` }).int().min(min, `${label} must be at least ${min}`);

/**
 * Parse the rule fields of a form. `optional` (types/resources): blank = inherit (null).
 * Working days need an explicit "override" tick in that case, since an unticked group is ambiguous.
 */
export function parseRules(obj: Record<string, unknown>, optional: boolean) {
  const f = <T extends z.ZodTypeAny>(s: T) => (optional ? s.optional() : s);
  const v = parse(
    z.object({
      workStart: f(timeStr),
      workEnd: f(timeStr),
      minSlotMinutes: f(int("Slot size", 5)),
      maxDurationMinutes: f(int("Max duration", 5)),
      bufferMinutes: f(int("Buffer")),
      cancelCutoffMinutes: f(int("Cancel cut-off")),
    }),
    obj,
  );
  const overrideDays = !optional || obj.overrideDays !== undefined;
  const workingDays = overrideDays
    ? parse(z.array(z.coerce.number().int().min(1).max(7)).min(1, "Pick at least one working day"), asArray(obj.workingDays))
    : null;
  const approval = obj.requiresApproval;
  const requiresApproval = optional ? (approval === "yes" ? true : approval === "no" ? false : null) : approval === "yes";
  const out = {
    workingDays,
    workStart: v.workStart ?? null,
    workEnd: v.workEnd ?? null,
    minSlotMinutes: v.minSlotMinutes ?? null,
    maxDurationMinutes: v.maxDurationMinutes ?? null,
    bufferMinutes: v.bufferMinutes ?? null,
    cancelCutoffMinutes: v.cancelCutoffMinutes ?? null,
    requiresApproval,
  };
  if (out.workStart && out.workEnd && out.workStart >= out.workEnd)
    throw new AppError("VALIDATION", "Working hours must end after they start", { fieldErrors: { workEnd: "Must be after start" } });
  return out;
}

// ---------- catalogue ----------
const optText = (max = 500) => z.string().max(max).optional();

export const resourceInput = z.object({
  assetCode: z.string().min(1, "Required").max(40),
  name: z.string().min(1, "Required").max(120),
  typeId: uuid,
  locationId: uuid,
  description: optText(),
  capacity: z.coerce.number().int().min(0).optional(),
  make: optText(80),
  model: optText(80),
  serialNumber: optText(80),
  status: z.enum(["active", "maintenance", "retired"]),
});

export const typeInput = z.object({
  name: z.string().min(1, "Required").max(80),
  slug: z.string().min(1, "Required").max(60).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes"),
});

export const locationInput = z.object({
  name: z.string().min(1, "Required").max(120),
  kind: z.enum(["site", "building", "floor", "area"]),
  parentId: uuid.optional(),
});
