import styles from "./Badge.module.css";

const TONE: Record<string, string> = {
  approved: "success",
  active: "success",
  pending: "warn",
  maintenance: "warn",
  expired: "grey",
  retired: "grey",
  cancelled: "grey",
  rejected: "danger",
  admin: "primary",
  user: "grey",
  info: "primary",
};

export function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  return <span className={`${styles.badge} ${styles[TONE[status] ?? "grey"]}`}>{children ?? status}</span>;
}
