import { ApprovalItem } from "@/components/features/ApprovalItem";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminCount, listPending } from "@/server/approvals";
import { pageUser } from "@/server/session";

export default async function ApprovalsPage() {
  const user = await pageUser("booking:approve");
  const [items, admins] = await Promise.all([listPending(), adminCount()]);
  return (
    <>
      <PageHeader title="Approvals" subtitle={`${items.length} waiting. Recurring requests are decided as one unit.`} />
      {items.length === 0 ? (
        <EmptyState title="All caught up">No requests are waiting for a decision.</EmptyState>
      ) : (
        <div className="stack">
          {items.map((it) => (
            <ApprovalItem key={`${it.kind}-${it.id}`} item={it} ownBlocked={it.userId === user.id && admins > 1} />
          ))}
        </div>
      )}
    </>
  );
}
