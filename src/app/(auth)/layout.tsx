import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <aside className={styles.panel}>
        <p className={styles.brand}>
          <span aria-hidden="true" className={styles.mark} />
          Resource Booking
        </p>
        <div className={styles.pitch}>
          <h2 className={styles.headline}>Rooms, desks and equipment, booked in a minute.</h2>
          <p className={styles.sub}>See what&apos;s free right now across every building and floor.</p>
        </div>
      </aside>
      <main className={styles.side}>
        <div className={styles.column}>{children}</div>
      </main>
    </div>
  );
}
