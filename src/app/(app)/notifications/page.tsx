import { markAllRead, markNotificationRead } from "@/actions/notifications";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt } from "@/lib/time";
import { listNotifications } from "@/server/notifications";
import { pageUser } from "@/server/session";
import styles from "./page.module.css";

export default async function NotificationsPage() {
  const user = await pageUser();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        actions={unread > 0 && <ActionButton action={markAllRead} successMessage="All marked as read">Mark all as read</ActionButton>}
      />
      {items.length === 0 ? (
        <EmptyState title="Nothing yet">You&apos;ll see booking updates here.</EmptyState>
      ) : (
        <ul className={styles.list}>
          {items.map((n) => (
            <li key={n.id} className={n.readAt ? styles.read : styles.unread}>
              <div className="grow">
                <div className="row">
                  <strong>{n.title}</strong>
                  {!n.readAt && <Badge status="info">New</Badge>}
                </div>
                <p>{n.body}</p>
                <span className="muted small">{fmt(n.createdAt, "d MMM yyyy, HH:mm")}</span>
              </div>
              {!n.readAt && (
                <ActionButton action={markNotificationRead.bind(null, n.id)} successMessage="Marked as read">
                  Mark read
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
