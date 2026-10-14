import type { Actor } from "@/server/permissions";
import { Navbar } from "./Navbar";
import styles from "./AppShell.module.css";

export function AppShell({ user, sidebar, children }: { user: Actor; sidebar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar user={user} />
      <div className={styles.body}>
        {sidebar}
        <main id="main" tabIndex={-1} className={styles.main}>{children}</main>
      </div>
    </>
  );
}
