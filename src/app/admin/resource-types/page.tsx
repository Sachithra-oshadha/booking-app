import Link from "next/link";
import { deleteResourceType, saveResourceType } from "@/actions/catalogue";
import { RulesFields } from "@/components/features/RulesFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { ActionButton } from "@/components/ui/ActionButton";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { db } from "@/db";
import { resourceTypes } from "@/db/schema";
import { DAY_NAMES } from "@/lib/time";
import { inheritedRules } from "@/server/rules";
import { pageUser } from "@/server/session";

const dash = (v: unknown) => (v === null || v === undefined ? <span className="muted">inherit</span> : String(v));

export const metadata = { title: "Resource types" };

export default async function ResourceTypesPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await pageUser("resource-type:manage");
  const sp = await searchParams;
  const types = await db.select().from(resourceTypes).orderBy(resourceTypes.name);
  const editing = types.find((t) => t.id === sp.edit);
  const showForm = !!editing || sp.new === "1";
  const inherited = await inheritedRules();

  return (
    <>
      <PageHeader title="Resource types" subtitle="Defaults for every resource of a type. Blank fields inherit the global settings." actions={!showForm && <LinkButton href="/admin/resource-types?new=1">New type</LinkButton>} />
      {showForm && (
        <Card title={editing ? `Edit ${editing.name}` : "New type"} actions={<Link href="/admin/resource-types">Close</Link>}>
          <ActionForm key={editing?.id ?? "new"} action={saveResourceType} resetOnSuccess={!editing} successMessage="Type saved" className="stack">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="row">
              <FormField label="Name" name="name"><Input name="name" defaultValue={editing?.name} required /></FormField>
              <FormField label="Slug" name="slug" hint="lowercase, e.g. room"><Input name="slug" defaultValue={editing?.slug} required /></FormField>
            </div>
            <RulesFields values={editing} optional inherited={inherited} />
            <div><SubmitButton>{editing ? "Save changes" : "Create type"}</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      <Table>
        <thead>
          <tr><th>Name</th><th>Days</th><th>Hours</th><th>Slot</th><th>Max</th><th>Buffer</th><th>Cut-off</th><th>Approval</th><th></th></tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong> <span className="muted small">{t.slug}</span></td>
              <td>{t.workingDays ? t.workingDays.map((d) => DAY_NAMES[d]).join(" ") : dash(null)}</td>
              <td>{t.workStart && t.workEnd ? `${t.workStart.slice(0, 5)}–${t.workEnd.slice(0, 5)}` : dash(null)}</td>
              <td>{dash(t.minSlotMinutes)}</td>
              <td>{dash(t.maxDurationMinutes)}</td>
              <td>{dash(t.bufferMinutes)}</td>
              <td>{dash(t.cancelCutoffMinutes)}</td>
              <td>{t.requiresApproval === null ? dash(null) : t.requiresApproval ? "Yes" : "No"}</td>
              <td>
                <div className="row">
                  <LinkButton href={`/admin/resource-types?edit=${t.id}`} variant="secondary" size="sm">Edit</LinkButton>
                  <ActionButton action={deleteResourceType.bind(null, t.id)} confirm={`Delete the ${t.name} type? This fails while resources use it.`} successMessage="Type deleted">Delete</ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
