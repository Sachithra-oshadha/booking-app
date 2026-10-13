import styles from "./EmptyState.module.css";

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
