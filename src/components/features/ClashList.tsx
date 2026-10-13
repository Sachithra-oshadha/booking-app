import { fmt, fromLocal } from "@/lib/time";
import type { Clash } from "@/server/series";
import styles from "./ClashList.module.css";

export function ClashList({ clashes }: { clashes: Clash[] }) {
  return (
    <div className={styles.box} role="alert">
      <strong>Nothing was booked. These dates have a problem:</strong>
      <ul>
        {clashes.map((c) => (
          <li key={c.date}>
            <span className={styles.date}>{fmt(fromLocal(c.date, "12:00"), "EEE d MMM yyyy")}</span> {c.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
