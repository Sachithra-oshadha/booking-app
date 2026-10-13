import Link from "next/link";
import { can, type Actor } from "@/server/permissions";
import { unreadCount } from "@/server/notifications";
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
        <nav className={styles.links}>
          <Link href="/resources">Resources</Link>
          <Link href="/bookings">My bookings</Link>
          {can(user, "booking:approve") && <Link href="/admin/approvals">Admin</Link>}
        </nav>
        <div className={styles.right}>
          <Link href="/notifications" className={styles.bell} aria-label={`Notifications, ${unread} unread`}>
            Notifications
            {unread > 0 && <span className={styles.count}>{unread}</span>}
          </Link>
          <span className={styles.user}>{user.name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
