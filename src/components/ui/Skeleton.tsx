import styles from "./Skeleton.module.css";

/** Neutral loading placeholder for route transitions. */
export function PageSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className={`${styles.bar} ${styles.title}`} />
      <div className={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${styles.bar} ${styles.card}`} />
        ))}
      </div>
    </div>
  );
}
