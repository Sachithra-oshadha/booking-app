import { Corners } from "./Corners";
import styles from "./EmptyState.module.css";

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <Corners />
      <strong className={styles.title}>{title}</strong>
      {children && <p className="muted">{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
