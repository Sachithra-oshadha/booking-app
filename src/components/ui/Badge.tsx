import styles from "./Badge.module.css";

const TONE: Record<string, string> = {
  approved: "success",
  active: "success",
  available: "success",
  pending: "warn",
  maintenance: "outline",
  out: "outline",
  expired: "grey",
  retired: "grey",
  cancelled: "grey",
  booked: "grey",
  closed: "grey",
  rejected: "danger",
  admin: "primary",
  user: "grey",
  info: "primary",
};

export function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  const tone = TONE[status] ?? "grey";
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <span aria-hidden="true" className={styles.dot} />
      {children ?? status}
    </span>
  );
}
