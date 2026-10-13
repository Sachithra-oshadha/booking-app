import assert from "node:assert/strict";
import { test } from "node:test";
import { expandOccurrences, validateSlot, type Rules } from "./slot";
import { fromLocal } from "./time";

const rules: Rules = {
  workingDays: [1, 2, 3, 4, 5],
  workStartMin: 8 * 60,
  workEndMin: 18 * 60,
  minSlotMinutes: 30,
  maxDurationMinutes: 240,
  bufferMinutes: 0,
  cancelCutoffMinutes: 60,
  requiresApproval: false,
};
const now = fromLocal("2030-01-01", "00:00"); // fixed "now" far from any real date
// 2030-01-07 is a Monday, 2030-01-12 a Saturday
const slot = (date: string, a: string, b: string) => validateSlot(rules, fromLocal(date, a), fromLocal(date, b), now);

test("valid slot", () => assert.deepEqual(slot("2030-01-07", "09:00", "10:30"), []));
test("in the past", () => assert.match(slot("2029-12-31", "09:00", "10:00")[0], /future/));
test("end before start", () => assert.match(slot("2030-01-07", "10:00", "09:00")[0], /after start/));
test("outside working hours", () => {
  assert.match(slot("2030-01-07", "07:30", "09:00")[0], /working hours/);
  assert.match(slot("2030-01-07", "17:00", "18:30")[0], /working hours/);
});
test("weekend", () => assert.match(slot("2030-01-12", "09:00", "10:00")[0], /Not bookable on Sat/));
test("misaligned start / duration", () => {
  assert.match(slot("2030-01-07", "09:15", "10:15")[0], /slots/);
  assert.match(slot("2030-01-07", "09:00", "09:45")[0], /slots/);
});
test("too long", () => assert.match(slot("2030-01-07", "08:00", "13:00")[0], /Maximum/));
test("overnight", () =>
  assert.match(validateSlot(rules, fromLocal("2030-01-07", "17:00"), fromLocal("2030-01-08", "09:00"), now)[0], /same day/));

test("daily skips weekends", () => {
  const { dates } = expandOccurrences({ pattern: "daily", startDate: "2030-01-10", occurrenceCount: 4 }, rules.workingDays);
  assert.deepEqual(dates, ["2030-01-10", "2030-01-11", "2030-01-14", "2030-01-15"]);
});
test("weekly keeps the weekday", () => {
  const { dates } = expandOccurrences({ pattern: "weekly", startDate: "2030-01-07", untilDate: "2030-01-28" }, rules.workingDays);
  assert.deepEqual(dates, ["2030-01-07", "2030-01-14", "2030-01-21", "2030-01-28"]);
});
test("cap at 52", () => {
  const r = expandOccurrences({ pattern: "daily", startDate: "2030-01-07", untilDate: "2031-12-31" }, rules.workingDays);
  assert.equal(r.tooMany, true);
});
