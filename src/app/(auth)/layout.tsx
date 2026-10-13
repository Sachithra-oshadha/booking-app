import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.brand}>Resource Booking</p>
      {children}
    </div>
  );
}
