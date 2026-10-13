import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { ResourceListItem } from "@/server/availability";
import styles from "./ResourceCard.module.css";

export function ResourceCard({ r, freeNow }: { r: ResourceListItem; freeNow: boolean }) {
  return (
    <Link href={`/resources/${r.id}`} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.code}>{r.assetCode}</span>
        <Badge status={r.status} />
      </div>
      <h3>{r.name}</h3>
      <p className="muted small">{r.typeName}{r.capacity ? ` · seats ${r.capacity}` : ""}</p>
      <p className="muted small">{r.locationPath}</p>
      <div className={styles.foot}>
        {r.status === "active" && (freeNow ? <Badge status="approved">Free now</Badge> : <Badge status="cancelled">In use / closed</Badge>)}
        {r.rules.requiresApproval && <Badge status="pending">Needs approval</Badge>}
      </div>
    </Link>
  );
}
