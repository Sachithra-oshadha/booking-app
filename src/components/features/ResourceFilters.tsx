import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { LocationRow } from "@/server/locations";
import { LocationPicker } from "./LocationPicker";
import styles from "./ResourceFilters.module.css";
import { Search } from "lucide-react";

/** Plain GET form: filters live in the URL, so the list page stays a server component.
 *  Availability is picked from the summary strip above, so it rides along as a hidden field. */
export function ResourceFilters({
  types,
  locations,
  values,
}: {
  types: { id: string; name: string }[];
  locations: LocationRow[];
  values: { q?: string; type?: string; location?: string; state?: string };
}) {
  const active = values.q || values.type || values.location || values.state;
  return (
    <form className={styles.form} method="get" role="search">
      <div className={styles.search}>
        <Search aria-hidden="true" size={18} strokeWidth={1.5} />
        <Input name="q" placeholder="Search by name or asset code" defaultValue={values.q} aria-label="Search" />
      </div>
      <Select name="type" defaultValue={values.type ?? ""} aria-label="Type">
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <LocationPicker locations={locations} name="location" defaultValue={values.location} />
      {values.state && <input type="hidden" name="state" value={values.state} />}
      <Button type="submit">Apply</Button>
      {active && (
        <Link href="/resources" className={styles.clear}>
          Clear filters
        </Link>
      )}
    </form>
  );
}
