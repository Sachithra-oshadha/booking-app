import type { Actor } from "@/server/permissions";
import { Navbar } from "./Navbar";
import styles from "./AppShell.module.css";

export function AppShell({ user, sidebar, children }: { user: Actor; sidebar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Navbar user={user} />
      <div className={styles.body}>
        {sidebar}
        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
}
