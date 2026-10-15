import Link from "next/link";
import { can, type Actor } from "@/server/permissions";
import { unreadCount } from "@/server/notifications";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";
import styles from "./Navbar.module.css";
import { Bell } from "lucide-react";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export async function Navbar({ user }: { user: Actor }) {
  const unread = await unreadCount(user.id);
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/resources" className={styles.brand}>
          <span aria-hidden="true" className={styles.mark} />
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
            <Bell aria-hidden="true" size={20} strokeWidth={1.5} />
            {unread > 0 && <span className={styles.count}>{unread}</span>}
          </Link>
          <div className={styles.user}>
            <span aria-hidden="true" className={styles.avatar}>{initials(user.name)}</span>
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role === "admin" ? "Administrator" : "Member"}</span>
            </span>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
