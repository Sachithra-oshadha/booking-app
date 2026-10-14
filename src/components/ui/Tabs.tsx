import Link from "next/link";
import styles from "./Tabs.module.css";

/** Link-based tabs: the active tab lives in the URL, so no client state is needed. */
export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`${styles.tab} ${t.key === active ? styles.active : ""}`} aria-current={t.key === active ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
