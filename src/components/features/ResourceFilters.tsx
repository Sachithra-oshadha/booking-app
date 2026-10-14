import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import type { LocationRow } from "@/server/locations";
import { LocationPicker } from "./LocationPicker";
import styles from "./ResourceFilters.module.css";

/** Plain GET form: filters live in the URL, so the list page stays a server component. */
export function ResourceFilters({
  types,
  locations,
  values,
}: {
  types: { id: string; name: string }[];
  locations: LocationRow[];
  values: { q?: string; type?: string; location?: string; status?: string; now?: string };
}) {
  return (
    <form className={styles.form} method="get">
      <Input name="q" placeholder="Search name or asset code" defaultValue={values.q} aria-label="Search" />
      <Select name="type" defaultValue={values.type ?? ""} aria-label="Type">
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <LocationPicker locations={locations} name="location" defaultValue={values.location} />
      <Select name="status" defaultValue={values.status ?? ""} aria-label="Status">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="maintenance">Maintenance</option>
        <option value="retired">Retired</option>
      </Select>
      <Checkbox name="now" value="1" label="Available now" defaultChecked={values.now === "1"} />
      <Button type="submit">Filter</Button>
      {(values.q || values.type || values.location || values.status || values.now) && <Link href="/resources">Clear filters</Link>}
    </form>
  );
}
