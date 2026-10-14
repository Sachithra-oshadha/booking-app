import Link from "next/link";
import { deleteLocation, saveLocation } from "@/actions/catalogue";
import { LocationPicker } from "@/components/features/LocationPicker";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { KINDS, listLocations } from "@/server/locations";
import { pageUser } from "@/server/session";

export const metadata = { title: "Locations" };

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await pageUser("location:manage");
  const sp = await searchParams;
  const locations = await listLocations();
  const editing = locations.find((l) => l.id === sp.edit);

  return (
    <>
      <PageHeader title="Locations" subtitle="Site → building → floor → area. A location can only be deleted when it is empty." />
      <Card title={editing ? `Rename ${editing.name}` : "Add a location"} actions={editing && <Link href="/admin/locations">Cancel</Link>}>
        <ActionForm key={editing?.id ?? "new"} action={saveLocation} resetOnSuccess={!editing} successMessage="Location saved" className="row">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <FormField label="Name" name="name"><Input name="name" defaultValue={editing?.name} required /></FormField>
          {!editing && (
            <>
              <FormField label="Kind" name="kind">
                <Select name="kind" defaultValue="building">
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </Select>
              </FormField>
              <FormField label="Parent" name="parentId" hint="Sites have no parent; others need the level above">
                <LocationPicker locations={locations} name="parentId" placeholder="None (site)" />
              </FormField>
            </>
          )}
          <div className="end"><SubmitButton>{editing ? "Rename" : "Add"}</SubmitButton></div>
        </ActionForm>
      </Card>
      <Table>
        <thead><tr><th>Location</th><th>Kind</th><th></th></tr></thead>
        <tbody>
          {locations.map((l) => (
            <tr key={l.id}>
              <td style={{ paddingLeft: 12 + l.depth * 24 }}>{l.name}</td>
              <td><Badge status="cancelled">{l.kind}</Badge></td>
              <td>
                <div className="row">
                  <Link href={`/admin/locations?edit=${l.id}`}>Rename</Link>
                  <ActionButton action={deleteLocation.bind(null, l.id)} confirm={`Delete ${l.name}?`} successMessage="Location deleted">Delete</ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
