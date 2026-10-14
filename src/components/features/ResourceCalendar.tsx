"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import styles from "./ResourceCalendar.module.css";

export type CalEvent = {
  id: string;
  title: string;
  start: string; // Colombo wall-clock ISO, no offset
  end: string;
  kind: "own" | "other" | "pending" | "buffer";
};

const KIND_LABEL: Record<CalEvent["kind"], string> = {
  own: "Your booking",
  other: "Booked",
  pending: "Pending approval",
  buffer: "Buffer",
};

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * Week view in Asia/Colombo. Events arrive as wall-clock strings and the calendar runs in "UTC" mode,
 * so what you see is exactly Colombo time regardless of the browser's timezone.
 * Each kind of event differs by colour AND outline/pattern, and a text list mirrors the grid.
 */
export function ResourceCalendar({
  events,
  workingDays,
  workStart,
  workEnd,
  initialDate,
}: {
  events: CalEvent[];
  workingDays: number[]; // 1 = Mon … 7 = Sun
  workStart: string;
  workEnd: string;
  initialDate: string;
}) {
  const startHour = Math.max(0, Number(workStart.slice(0, 2)) - 1);
  const endHour = Math.min(24, Number(workEnd.slice(0, 2)) + 2);
  const listed = events.filter((e) => e.kind !== "buffer").sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className={styles.wrap}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate}
        timeZone="UTC"
        firstDay={1}
        allDaySlot={false}
        height="auto"
        nowIndicator={false}
        slotMinTime={`${String(startHour).padStart(2, "0")}:00:00`}
        slotMaxTime={`${String(endHour).padStart(2, "0")}:00:00`}
        slotDuration="00:30:00"
        headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" }}
        businessHours={{ daysOfWeek: workingDays.map((d) => d % 7), startTime: workStart, endTime: workEnd }}
        events={events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, classNames: [`ev-${e.kind}`] }))}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
      />
      <ul className={styles.legend}>
        <li><i className={styles.swOwn} /> Your booking</li>
        <li><i className={styles.swOther} /> Booked by others</li>
        <li><i className={styles.swPending} /> Pending approval (dashed outline)</li>
        <li><i className={styles.swBuffer} /> Buffer / cleanup (hatched)</li>
        <li><i className={styles.swClosed} /> Outside working hours</li>
      </ul>
      <details className={styles.list}>
        <summary>View these bookings as a list (Colombo time)</summary>
        {listed.length === 0 ? (
          <p className="muted">No bookings to show.</p>
        ) : (
          <ul>
            {listed.map((e) => (
              <li key={e.id}>
                <strong>{day(e.start)}, {e.start.slice(11, 16)}–{e.end.slice(11, 16)}</strong> · {KIND_LABEL[e.kind]} · {e.title}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
