import styles from "./EmptyState.module.css";

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
