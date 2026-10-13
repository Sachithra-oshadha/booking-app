import Link from "next/link";
import { retireResource } from "@/actions/catalogue";
import { ResourceForm } from "@/components/features/ResourceForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { db } from "@/db";
import { resourceTypes } from "@/db/schema";
import { loadResources } from "@/server/availability";
import { listLocations } from "@/server/locations";
import { getEffectiveRules, inheritedRules } from "@/server/rules";
import { pageUser } from "@/server/session";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await pageUser("resource:manage");
  const sp = await searchParams;
  const [types, locations, items] = await Promise.all([
    db.select().from(resourceTypes).orderBy(resourceTypes.name),
    listLocations(),
    loadResources(),
  ]);
  const editing = sp.edit && UUID.test(sp.edit) ? await getEffectiveRules(sp.edit) : null;
  const showForm = !!editing || sp.new === "1";
  const inherited = await inheritedRules(editing?.type ?? null);

  return (
    <>
      <PageHeader title="Resources" subtitle="Resources with bookings are retired, never deleted." actions={!showForm && <LinkButton href="/admin/resources?new=1">New resource</LinkButton>} />
      {showForm && (
        <Card title={editing ? `Edit ${editing.resource.name}` : "New resource"} actions={<Link href="/admin/resources">Close</Link>}>
          <ResourceForm key={editing?.resource.id ?? "new"} values={editing?.resource} types={types} locations={locations} inherited={inherited} />
        </Card>
      )}
      <Table>
        <thead>
          <tr><th>Code</th><th>Name</th><th>Type</th><th>Location</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td><code>{r.assetCode}</code></td>
              <td><Link href={`/resources/${r.id}`}>{r.name}</Link></td>
              <td>{r.typeName}</td>
              <td className="muted small">{r.locationPath}</td>
              <td><Badge status={r.status} /></td>
              <td>
                <div className="row">
                  <LinkButton href={`/admin/resources?edit=${r.id}`} variant="secondary" size="sm">Edit</LinkButton>
                  {r.status !== "retired" && (
                    <ActionButton
                      action={retireResource.bind(null, r.id)}
                      confirm="Retire this resource? It can no longer be booked. Existing bookings are kept."
                    >
                      Retire
                    </ActionButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
