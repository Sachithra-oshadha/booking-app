import { setUserRole } from "@/actions/catalogue";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { fmt } from "@/lib/time";
import { listUsers } from "@/server/catalogue";
import { pageUser } from "@/server/session";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await pageUser("user:manage-roles");
  const users = await listUsers();
  return (
    <>
      <PageHeader title="Users" subtitle="The last admin can't be demoted." />
      <Table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}{u.id === me.id && <span className="muted"> (you)</span>}</td>
              <td className="muted">{u.email}</td>
              <td><Badge status={u.role} /></td>
              <td className="muted small">{fmt(u.createdAt, "d MMM yyyy")}</td>
              <td>
                {u.role === "admin" ? (
                  <ActionButton action={setUserRole.bind(null, u.id, "user")} confirm={`Remove admin rights from ${u.name}?`} successMessage="Now a regular user">Demote to user</ActionButton>
                ) : (
                  <ActionButton action={setUserRole.bind(null, u.id, "admin")} confirm={`Make ${u.name} an admin?`} successMessage="Now an admin">Promote to admin</ActionButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
