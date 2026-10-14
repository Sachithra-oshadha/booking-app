import styles from "./Badge.module.css";

const ICON: Record<string, string> = { success: "✓", warn: "!", danger: "✕", grey: "–", primary: "●" };

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
  const tone = TONE[status] ?? "grey";
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <span aria-hidden="true">{ICON[tone]}</span> {children ?? status}
    </span>
  );
}
