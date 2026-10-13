import { saveResource } from "@/actions/catalogue";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { FormField } from "@/components/ui/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import type { Rules } from "@/lib/slot";
import type { LocationRow } from "@/server/locations";
import { LocationPicker } from "./LocationPicker";
import { RulesFields, type RuleValues } from "./RulesFields";
import styles from "./ResourceForm.module.css";

type Values = RuleValues & {
  id?: string;
  assetCode?: string;
  name?: string;
  typeId?: string;
  locationId?: string;
  description?: string | null;
  capacity?: number | null;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status?: string;
};

export function ResourceForm({
  values = {},
  types,
  locations,
  inherited,
}: {
  values?: Values;
  types: { id: string; name: string }[];
  locations: LocationRow[];
  inherited: Rules;
}) {
  return (
    <ActionForm
      action={saveResource}
      className={styles.form}
      resetOnSuccess={!values.id}
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className={styles.grid}>
        <FormField label="Asset code" name="assetCode" hint="Unique, e.g. VEH-004">
          <Input name="assetCode" defaultValue={values.assetCode} required />
        </FormField>
        <FormField label="Name" name="name">
          <Input name="name" defaultValue={values.name} required />
        </FormField>
        <FormField label="Type" name="typeId">
          <Select name="typeId" defaultValue={values.typeId ?? ""} required>
            <option value="" disabled>Choose a type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Location" name="locationId">
          <LocationPicker locations={locations} name="locationId" defaultValue={values.locationId} placeholder="Choose a location" required />
        </FormField>
        <FormField label="Status" name="status" hint="Only active resources can be booked">
          <Select name="status" defaultValue={values.status ?? "active"}>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </Select>
        </FormField>
        <FormField label="Capacity (rooms)" name="capacity">
          <Input type="number" name="capacity" min={0} defaultValue={values.capacity ?? undefined} />
        </FormField>
        <FormField label="Make" name="make">
          <Input name="make" defaultValue={values.make ?? undefined} />
        </FormField>
        <FormField label="Model" name="model">
          <Input name="model" defaultValue={values.model ?? undefined} />
        </FormField>
        <FormField label="Serial number" name="serialNumber">
          <Input name="serialNumber" defaultValue={values.serialNumber ?? undefined} />
        </FormField>
      </div>
      <FormField label="Description" name="description">
        <Textarea name="description" defaultValue={values.description ?? undefined} />
      </FormField>
      <RulesFields values={values} optional inherited={inherited} />
      <div>
        <SubmitButton>{values.id ? "Save changes" : "Create resource"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
