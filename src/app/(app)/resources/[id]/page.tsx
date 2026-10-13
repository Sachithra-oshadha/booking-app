import { notFound } from "next/navigation";
import { BookingForm } from "@/components/features/BookingForm";
import { ResourceCalendar, type CalEvent } from "@/components/features/ResourceCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { minutesToTime, DAY_NAMES, todayLocal, wallClockISO } from "@/lib/time";
import { calendarBookings } from "@/server/bookings";
import { listLocations } from "@/server/locations";
import { can } from "@/server/permissions";
import { getEffectiveRules } from "@/server/rules";
import { pageUser } from "@/server/session";
import styles from "./page.module.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; start?: string; end?: string }>;
}) {
  const user = await pageUser("resource:view");
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const ctx = await getEffectiveRules(id);
  if (!ctx) notFound();
  const { resource: r, type, rules } = ctx;

  // ponytail: loads everything from a week ago onwards; add a date-range fetch if one resource gets thousands of bookings.
  const [rows, locations] = await Promise.all([calendarBookings(id), listLocations()]);
  const seeAll = can(user, "booking:view:all");

  const events: CalEvent[] = rows.flatMap((b) => {
    const mine = b.userId === user.id;
    const detail = mine || seeAll;
    const title = detail ? `${mine ? "You" : b.userName}${b.purpose ? `: ${b.purpose}` : ""}` : "Booked";
    const list: CalEvent[] = [
      {
        id: b.id,
        title: b.status === "pending" ? `Pending · ${title}` : title,
        start: wallClockISO(b.startsAt),
        end: wallClockISO(b.endsAt),
        kind: b.status === "pending" ? "pending" : mine ? "own" : "other",
      },
    ];
    if (b.blockedUntil > b.endsAt) {
      list.push({ id: `${b.id}-buffer`, title: "Buffer", start: wallClockISO(b.endsAt), end: wallClockISO(b.blockedUntil), kind: "buffer" });
    }
    return list;
  });

  const location = locations.find((l) => l.id === r.locationId)?.path ?? "";
  const bookable = r.status === "active";
  const mins = (m: number) => `${m} min`;

  return (
    <>
      <PageHeader title={r.name} subtitle={`${r.assetCode} · ${type.name} · ${location}`} actions={<Badge status={r.status} />} />

      <div className={styles.layout}>
        <div className="stack">
          <Card title="Availability (Asia/Colombo)">
            <ResourceCalendar
              events={events}
              workingDays={rules.workingDays}
              workStart={minutesToTime(rules.workStartMin)}
              workEnd={minutesToTime(rules.workEndMin)}
              initialDate={sp.date ?? todayLocal()}
            />
          </Card>
        </div>

        <div className="stack">
          <Card title="Book this resource">
            {bookable ? (
              <BookingForm
                resourceId={r.id}
                slotMinutes={rules.minSlotMinutes}
                workStart={minutesToTime(rules.workStartMin)}
                workEnd={minutesToTime(rules.workEndMin)}
                today={todayLocal()}
                defaults={sp}
                requiresApproval={rules.requiresApproval}
              />
            ) : (
              <p className="muted">This resource is {r.status} and can&apos;t be booked right now.</p>
            )}
          </Card>

          <Card title="Rules that apply">
            <dl className={styles.rules}>
              <dt>Working days</dt><dd>{rules.workingDays.map((d) => DAY_NAMES[d]).join(", ")}</dd>
              <dt>Working hours</dt><dd>{minutesToTime(rules.workStartMin)}–{minutesToTime(rules.workEndMin)}</dd>
              <dt>Slot size</dt><dd>{mins(rules.minSlotMinutes)}</dd>
              <dt>Longest booking</dt><dd>{mins(rules.maxDurationMinutes)}</dd>
              <dt>Buffer after booking</dt><dd>{mins(rules.bufferMinutes)}</dd>
              <dt>Cancel at least</dt><dd>{mins(rules.cancelCutoffMinutes)} before start</dd>
              <dt>Approval</dt><dd>{rules.requiresApproval ? "Required" : "Not required"}</dd>
            </dl>
          </Card>

          {(r.description || r.make || r.model || r.serialNumber || r.capacity) && (
            <Card title="Details">
              <dl className={styles.rules}>
                {r.description && <><dt>About</dt><dd>{r.description}</dd></>}
                {r.capacity && <><dt>Capacity</dt><dd>{r.capacity}</dd></>}
                {r.make && <><dt>Make</dt><dd>{r.make}</dd></>}
                {r.model && <><dt>Model</dt><dd>{r.model}</dd></>}
                {r.serialNumber && <><dt>Serial</dt><dd>{r.serialNumber}</dd></>}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
