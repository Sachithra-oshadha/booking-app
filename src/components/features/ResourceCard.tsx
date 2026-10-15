import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Corners } from "@/components/ui/Corners";
import type { LiveStateKey, ResourceWithLive } from "@/server/availability";
import styles from "./ResourceCard.module.css";
import { Clock, MapPin } from "lucide-react";

const LABEL: Record<LiveStateKey, string> = { available: "Available", booked: "Booked", closed: "Closed", out: "Out of service" };
const CTA: Record<LiveStateKey, string> = { available: "Book now", booked: "Book later", closed: "Book ahead", out: "Details" };

export function ResourceCard({ r }: { r: ResourceWithLive }) {
  const { state, note } = r.live;
  const parts = r.locationPath.split("›").map((p) => p.trim()).filter(Boolean);
  const place = parts.slice(0, 2).join(" › ");
  const area = parts.slice(2).join(" · ");
  const dim = state === "closed" || state === "out";
  return (
    <Link href={`/resources/${r.id}`} className={`${styles.card} ${dim ? styles.dim : ""}`}>
      <Corners />
      <div className={styles.top}>
        <span className={styles.code}>
          {r.assetCode} · {r.typeName}
        </span>
        <Badge status={state}>{LABEL[state]}</Badge>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{r.name}</h3>
        <p className={styles.loc}>
          <MapPin aria-hidden="true" size={16} strokeWidth={1.5} />
          <span>
            <span className={styles.place}>{place}</span>
            {area && <span className={styles.area}>{area}</span>}
          </span>
        </p>
        {(r.capacity || r.rules.requiresApproval) && (
          <div className={styles.meta}>
            {r.capacity ? <span className="muted small">Seats {r.capacity}</span> : null}
            {r.rules.requiresApproval && <Badge status="pending">Needs approval</Badge>}
          </div>
        )}
      </div>
      <div className={styles.foot}>
        <span className={`${styles.note} ${state === "available" ? styles.noteOn : ""}`}>
          <Clock aria-hidden="true" size={14} strokeWidth={1.5} />
          {note}
        </span>
        <span aria-hidden="true" className={`${styles.cta} ${state === "available" ? styles.ctaPrimary : dim ? styles.ctaGhost : ""}`}>
          {CTA[state]}
        </span>
      </div>
    </Link>
  );
}
