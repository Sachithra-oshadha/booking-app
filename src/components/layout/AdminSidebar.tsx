"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const LINKS = [
  ["/admin/approvals", "Approvals"],
  ["/admin/bookings", "All bookings"],
  ["/admin/resources", "Resources"],
  ["/admin/resource-types", "Resource types"],
  ["/admin/locations", "Locations"],
  ["/admin/users", "Users"],
  ["/admin/settings", "Settings"],
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className={styles.side}>
      <strong className={styles.title}>Admin</strong>
      <nav className={styles.nav}>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path.startsWith(href) ? styles.active : ""}>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
