import { Corners } from "./Corners";
import styles from "./Card.module.css";

export function Card({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <Corners />
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
