import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

// Single organisation timezone. Asia/Colombo has no DST, so local <-> UTC is a fixed +05:30,
// but everything still goes through these helpers so that assumption lives in one place.
export const TZ = "Asia/Colombo";

export function localParts(d: Date) {
  const t = new TZDate(d, TZ);
  return { date: format(t, "yyyy-MM-dd"), minutes: t.getHours() * 60 + t.getMinutes(), isoDay: t.getDay() || 7 };
}

/** "2026-10-14" + "09:30" (Colombo wall clock) -> UTC Date */
export function fromLocal(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, h, mi, 0, TZ).getTime());
}

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function isoDayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

export const fmt = (d: Date, pattern = "EEE d MMM, HH:mm") => format(new TZDate(d, TZ), pattern);
export const fmtRange = (a: Date, b: Date) => `${fmt(a)} – ${fmt(b, "HH:mm")}`;

/** Wall-clock ISO string without offset; used with FullCalendar timeZone "UTC" so it shows Colombo time as-is. */
export const wallClockISO = (d: Date) => format(new TZDate(d, TZ), "yyyy-MM-dd'T'HH:mm:ss");

export const todayLocal = () => localParts(new Date()).date;
export const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
