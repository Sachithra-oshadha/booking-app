import Link from "next/link";
import { can, type Actor } from "@/server/permissions";
import { unreadCount } from "@/server/notifications";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";
import styles from "./Navbar.module.css";

export async function Navbar({ user }: { user: Actor }) {
  const unread = await unreadCount(user.id);
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/resources" className={styles.brand}>
          Resource Booking
        </Link>
        <NavLinks
          links={[
            ["/resources", "Resources"],
            ["/bookings", "My bookings"],
            ...(can(user, "booking:approve") ? ([["/admin/approvals", "Admin"]] as [string, string][]) : []),
          ]}
        />
        <div className={styles.right}>
          <Link href="/notifications" className={styles.bell} aria-label={`Notifications, ${unread} unread`}>
            <span aria-hidden="true" className={styles.bellIcon}>🔔</span>
            <span className={styles.bellText}>Notifications</span>
            {unread > 0 && <span className={styles.count}>{unread}</span>}
          </Link>
          <span className={styles.user}>{user.name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
