"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const GROUPS: { title: string; links: [string, string][] }[] = [
  { title: "Operations", links: [["/admin/approvals", "Approvals"], ["/admin/bookings", "All bookings"]] },
  { title: "Catalogue", links: [["/admin/resources", "Resources"], ["/admin/resource-types", "Resource types"], ["/admin/locations", "Locations"]] },
  { title: "System", links: [["/admin/users", "Users"], ["/admin/settings", "Settings"]] },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className={styles.side} aria-label="Admin">
      <strong className={styles.title}>Admin</strong>
      <nav className={styles.nav} aria-label="Admin sections">
        {GROUPS.map((g) => (
          <div key={g.title} className={styles.group}>
            <span className={styles.groupTitle}>{g.title}</span>
            {g.links.map(([href, label]) => {
              const active = path.startsWith(href);
              return (
                <Link key={href} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
