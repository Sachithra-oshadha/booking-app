import { addDays, isoDayOf, localParts, minutesToTime, DAY_NAMES } from "./time";

/** Fully resolved rules for one resource. */
export type Rules = {
  workingDays: number[]; // 1 = Mon … 7 = Sun
  workStartMin: number; // minutes since local midnight
  workEndMin: number;
  minSlotMinutes: number;
  maxDurationMinutes: number;
  bufferMinutes: number;
  cancelCutoffMinutes: number;
  requiresApproval: boolean;
};

const hm = (m: number) => minutesToTime(m);

/** Pure slot validation (section 6, steps 3–7). Returns the first problem, or [] when the slot is OK. */
export function validateSlot(rules: Rules, startsAt: Date, endsAt: Date, now = new Date()): string[] {
  if (endsAt <= startsAt) return ["End time must be after start time."];
  if (startsAt <= now) return ["Start time must be in the future."];
  const s = localParts(startsAt);
  const e = localParts(endsAt);
  if (s.date !== e.date) return ["A booking must start and end on the same day."];
  if (!rules.workingDays.includes(s.isoDay)) {
    return [`Not bookable on ${DAY_NAMES[s.isoDay]} (working days: ${rules.workingDays.map((d) => DAY_NAMES[d]).join(", ")}).`];
  }
  if (s.minutes < rules.workStartMin || e.minutes > rules.workEndMin) {
    return [`Bookings must be within working hours ${hm(rules.workStartMin)}–${hm(rules.workEndMin)}.`];
  }
  const duration = e.minutes - s.minutes;
  if ((s.minutes - rules.workStartMin) % rules.minSlotMinutes !== 0 || duration % rules.minSlotMinutes !== 0) {
    return [`Times must line up with ${rules.minSlotMinutes}-minute slots counted from ${hm(rules.workStartMin)}.`];
  }
  if (duration > rules.maxDurationMinutes) {
    return [`Maximum booking length is ${rules.maxDurationMinutes} minutes.`];
  }
  return [];
}

export const MAX_OCCURRENCES = 52;

/**
 * Expand a recurring pattern into local dates (YYYY-MM-DD).
 * daily  = every working day (non-working days skipped, not clashes)
 * weekly = same weekday as startDate
 * `tooMany` is true when the pattern would exceed MAX_OCCURRENCES.
 */
export function expandOccurrences(
  p: { pattern: "daily" | "weekly"; startDate: string; untilDate?: string | null; occurrenceCount?: number | null },
  workingDays: number[],
): { dates: string[]; tooMany: boolean } {
  const dates: string[] = [];
  const step = p.pattern === "daily" ? 1 : 7;
  let d = p.startDate;
  // iteration guard: 52 weekly occurrences ≈ 364 days; daily may skip weekends
  for (let i = 0; i < 800; i++) {
    if (p.untilDate && d > p.untilDate) break;
    if (p.occurrenceCount && dates.length >= p.occurrenceCount) break;
    if (p.pattern === "weekly" || workingDays.includes(isoDayOf(d))) dates.push(d);
    if (dates.length > MAX_OCCURRENCES) break;
    d = addDays(d, step);
  }
  return { dates, tooMany: dates.length > MAX_OCCURRENCES };
}
