import styles from "./Table.module.css";

/** Plain styled table wrapper; callers write the thead/tbody. `cards` turns rows into stacked cards on small screens (cells need data-label). */
export function Table({ children, cards }: { children: React.ReactNode; cards?: boolean }) {
  return (
    <div className={styles.wrap}>
      <table className={`${styles.table} ${cards ? styles.cards : ""}`}>{children}</table>
    </div>
  );
}
