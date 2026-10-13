import styles from "./Table.module.css";

/** Plain styled table wrapper; callers write the thead/tbody. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
