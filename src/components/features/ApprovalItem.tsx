"use client";

import { useState, useTransition } from "react";
import { approveBooking, approveSeries, rejectBooking, rejectSeries } from "@/actions/approvals";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { fmt, fmtRange } from "@/lib/time";
import styles from "./ApprovalItem.module.css";
import type { PendingItem } from "@/server/approvals";

export function ApprovalItem({ item }: { item: PendingItem }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const series = item.kind === "series";

  const decide = (kind: "approve" | "reject") =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", item.id);
      fd.set("note", note);
      const act = series ? (kind === "approve" ? approveSeries : rejectSeries) : kind === "approve" ? approveBooking : rejectBooking;
      const r = await act(fd);
      toast(r.ok ? (kind === "approve" ? "Approved" : "Rejected") : r.error, r.ok ? "success" : "error");
    });

  return (
    <Card>
      <div className="row">
        <div className="grow">
          <div className="row">
            <strong>{item.resource}</strong>
            <span className="muted small">{item.assetCode}</span>
            {series && <Badge status="info">Series · {item.count} bookings</Badge>}
          </div>
          <p>
            Requested by <strong>{item.user}</strong>
            {item.purpose ? ` · “${item.purpose}”` : ""}
          </p>
          <p className="muted">
            {series
              ? `${item.pattern}, ${item.startTime}–${item.endTime}, ${fmt(item.first, "EEE d MMM")} to ${fmt(item.last, "EEE d MMM yyyy")}`
              : fmtRange(item.startsAt, item.endsAt)}
          </p>
        </div>
        <div className="row">
          <Input placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} aria-label="Decision note" className={styles.note} />
          <Button disabled={pending} onClick={() => decide("approve")}>
            {series ? "Approve all" : "Approve"}
          </Button>
          <Button variant="danger" disabled={pending || !note.trim()} onClick={() => decide("reject")}>
            {series ? "Reject all" : "Reject"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
