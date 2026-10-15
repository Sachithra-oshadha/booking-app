"use client";

import Link from "next/link";
import { useState } from "react";
import { createBooking, createSeries } from "@/actions/bookings";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { FormField } from "@/components/ui/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import type { Result } from "@/lib/errors";
import type { Clash } from "@/server/series";
import { ClashList } from "./ClashList";
import styles from "./BookingForm.module.css";
import { Check } from "lucide-react";

export function BookingForm({
  resourceId,
  slotMinutes,
  workStart,
  workEnd,
  today,
  defaults,
  requiresApproval,
}: {
  resourceId: string;
  slotMinutes: number;
  workStart: string;
  workEnd: string;
  today: string;
  defaults: { date?: string; start?: string; end?: string };
  requiresApproval: boolean;
}) {
  const [recurring, setRecurring] = useState(false);
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [done, setDone] = useState(false);
  const [vals, setVals] = useState({ date: defaults.date ?? "", start: defaults.start ?? "", end: defaults.end ?? "" });
  const track = (e: React.ChangeEvent<HTMLElement>) => {
    const t = e.target as HTMLInputElement;
    const k = ({ date: "date", startDate: "date", startTime: "start", endTime: "end" } as Record<string, "date" | "start" | "end">)[t.name];
    if (k) setVals((v) => ({ ...v, [k]: t.value }));
    setDone(false);
  };
  const review =
    vals.date && vals.start && vals.end
      ? `${new Date(`${vals.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${vals.start}–${vals.end} (Asia/Colombo)${recurring ? ", then repeating" : ""}${requiresApproval ? " · needs admin approval" : " · confirmed instantly"}`
      : null;
  const timeProps = { step: slotMinutes * 60, min: workStart, max: workEnd, required: true };

  return (
    <ActionForm
      key={recurring ? "series" : "single"}
      action={recurring ? createSeries : createBooking}
      className={styles.form}
      successMessage={(d: unknown) => {
        const x = d as { status?: string; count?: number };
        if (recurring) return requiresApproval ? `Request for ${x.count} bookings sent for approval` : `${x.count} bookings confirmed`;
        return x.status === "pending" ? "Request sent for approval" : "Booking confirmed";
      }}
      onResult={(r: Result<unknown>) => {
        setClashes(!r.ok ? ((r.details as { clashes?: Clash[] } | undefined)?.clashes ?? []) : []);
        setDone(r.ok);
      }}
    >
      <input type="hidden" name="resourceId" value={resourceId} />
      <fieldset className={styles.toggle}>
        <legend className="sr-only">Booking type</legend>
        <label><input type="radio" checked={!recurring} onChange={() => { setRecurring(false); setVals({ date: defaults.date ?? "", start: defaults.start ?? "", end: defaults.end ?? "" }); }} /> Single booking</label>
        <label><input type="radio" checked={recurring} onChange={() => { setRecurring(true); setVals({ date: defaults.date ?? "", start: defaults.start ?? "", end: defaults.end ?? "" }); }} /> Recurring</label>
      </fieldset>

      <div className={styles.grid} onChange={track}>
        <FormField label={recurring ? "First date" : "Date"} name={recurring ? "startDate" : "date"}>
          <Input type="date" name={recurring ? "startDate" : "date"} min={today} defaultValue={defaults.date} required />
        </FormField>
        <FormField label="Start" name="startTime" hint={`Working hours ${workStart}–${workEnd}, ${slotMinutes}-min slots`}>
          <Input type="time" name="startTime" defaultValue={defaults.start} {...timeProps} />
        </FormField>
        <FormField label="End" name="endTime">
          <Input type="time" name="endTime" defaultValue={defaults.end} {...timeProps} />
        </FormField>
      </div>

      {recurring && (
        <div className={styles.grid}>
          <FormField label="Repeats" name="pattern" hint="Daily skips non-working days">
            <Select name="pattern" defaultValue="weekly">
              <option value="weekly">Weekly (same weekday)</option>
              <option value="daily">Daily (working days)</option>
            </Select>
          </FormField>
          <FormField label="Until (date)" name="untilDate" hint="Fill this or the count">
            <Input type="date" name="untilDate" min={today} />
          </FormField>
          <FormField label="…or number of bookings" name="occurrenceCount" hint="Max 52">
            <Input type="number" name="occurrenceCount" min={1} max={52} />
          </FormField>
        </div>
      )}

      <FormField label="Purpose (optional)" name="purpose">
        <Textarea name="purpose" maxLength={500} />
      </FormField>

      {review && <p className={styles.review} aria-live="polite"><strong>Review:</strong> {review}</p>}
      {done && (
        <p className={styles.done} role="status">
          <Check aria-hidden="true" size={16} style={{ verticalAlign: "text-bottom" }} /> Done. <Link href="/bookings">View in My bookings</Link>
        </p>
      )}
      {clashes.length > 0 && <ClashList clashes={clashes} />}
      <div>
        <SubmitButton>{requiresApproval ? "Request booking" : "Book now"}</SubmitButton>
        {requiresApproval && <span className="muted small"> &nbsp;An admin must approve this resource.</span>}
      </div>
    </ActionForm>
  );
}
