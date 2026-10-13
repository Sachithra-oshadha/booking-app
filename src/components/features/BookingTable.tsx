import Link from "next/link";
import { cancelBooking, cancelSeries } from "@/actions/bookings";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { fmtRange } from "@/lib/time";
import { cancelBlocker, displayStatus, type BookingRow } from "@/server/bookings";
import type { Actor } from "@/server/permissions";

/** Used by My bookings and the admin all-bookings page. `showUser` adds the booker column. */
export function BookingTable({
  rows,
  actor,
  series,
  showUser,
}: {
  rows: BookingRow[];
  actor: Actor;
  series: Map<string, { pattern: string; count: number }>;
  showUser?: boolean;
}) {
  if (rows.length === 0) return <EmptyState title="No bookings here" />;
  const now = new Date();
  return (
    <Table>
      <thead>
        <tr>
          <th>Resource</th>
          {showUser && <th>Booked by</th>}
          <th>When (Colombo)</th>
          <th>Status</th>
          <th>Purpose</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const status = displayStatus(b, now);
          const live = (b.status === "pending" || b.status === "approved") && b.endsAt > now;
          const blocker = live ? cancelBlocker(actor, b, now) : "n/a";
          const s = b.seriesId ? series.get(b.seriesId) : undefined;
          return (
            <tr key={b.id}>
              <td>
                <Link href={`/resources/${b.resourceId}`}>{b.resourceName}</Link>
                <div className="muted small">{b.assetCode}</div>
              </td>
              {showUser && <td>{b.userName}</td>}
              <td>
                {fmtRange(b.startsAt, b.endsAt)}
                {s && <div className="muted small">Recurring {s.pattern} · {s.count} in series</div>}
              </td>
              <td>
                <Badge status={status} />
                {b.decisionNote && <div className="muted small">“{b.decisionNote}”</div>}
              </td>
              <td className="muted">{b.purpose ?? "–"}</td>
              <td>
                <div className="row">
                  {live && blocker === null && (
                    <ActionButton action={cancelBooking.bind(null, b.id)} confirm="Cancel this booking?" successMessage="Booking cancelled">
                      Cancel
                    </ActionButton>
                  )}
                  {live && blocker === null && b.seriesId && (
                    <ActionButton action={cancelSeries.bind(null, b.seriesId)} confirm="Cancel every upcoming booking in this series?">
                      Cancel series
                    </ActionButton>
                  )}
                  {live && blocker && blocker !== "n/a" && <span className="muted small" title={blocker}>Cancel window passed</span>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
