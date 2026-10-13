import { Select } from "@/components/ui/Input";
import type { LocationRow } from "@/server/locations";

/** A select of the location tree, indented by depth. */
export function LocationPicker({
  locations,
  name,
  defaultValue,
  placeholder,
  required,
  kinds,
}: {
  locations: LocationRow[];
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  kinds?: string[];
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? ""} required={required}>
      <option value="">{placeholder ?? "Any location"}</option>
      {locations
        .filter((l) => !kinds || kinds.includes(l.kind))
        .map((l) => (
          <option key={l.id} value={l.id}>
            {"  ".repeat(l.depth)}
            {l.name} ({l.kind})
          </option>
        ))}
    </Select>
  );
}
