"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export function NavLinks({ links }: { links: [href: string, label: string][] }) {
  const path = usePathname();
  return (
    <nav className={styles.links} aria-label="Main">
      {links.map(([href, label]) => {
        const active = path.startsWith(href === "/admin/approvals" ? "/admin" : href);
        return (
          <Link key={href} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
