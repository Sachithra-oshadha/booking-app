import { FormField } from "@/components/ui/FormField";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { DAY_NAMES, minutesToTime } from "@/lib/time";
import type { Rules } from "@/lib/slot";
import styles from "./RulesFields.module.css";

export type RuleValues = {
  workingDays?: number[] | null;
  workStart?: string | null;
  workEnd?: string | null;
  minSlotMinutes?: number | null;
  maxDurationMinutes?: number | null;
  bufferMinutes?: number | null;
  cancelCutoffMinutes?: number | null;
  requiresApproval?: boolean | null;
};

const hm = (t?: string | null) => t?.slice(0, 5);

/**
 * Shared by global settings (required values) and resource types / resources (optional: blank = inherit).
 * `inherited` is what a blank field falls back to, shown as the placeholder.
 */
export function RulesFields({ values = {}, optional, inherited }: { values?: RuleValues; optional: boolean; inherited?: Rules }) {
  const days = values.workingDays ?? inherited?.workingDays ?? [1, 2, 3, 4, 5];
  const ph = (n: number | undefined) => (optional && n !== undefined ? `inherits ${n}` : undefined);
  const approval = values.requiresApproval == null ? "" : values.requiresApproval ? "yes" : "no";
  return (
    <fieldset className={styles.set}>
      <legend>Booking rules{optional && " (leave blank to inherit)"}</legend>

      <div className={styles.days}>
        {optional && <Checkbox name="overrideDays" value="1" label="Override working days" defaultChecked={!!values.workingDays} />}
        <div className={styles.dayRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Checkbox key={d} name="workingDays" value={d} label={DAY_NAMES[d]} defaultChecked={days.includes(d)} />
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        <FormField label="Opens" name="workStart" hint={optional && inherited ? `inherits ${minutesToTime(inherited.workStartMin)}` : undefined}>
          <Input type="time" name="workStart" defaultValue={hm(values.workStart)} required={!optional} />
        </FormField>
        <FormField label="Closes" name="workEnd" hint={optional && inherited ? `inherits ${minutesToTime(inherited.workEndMin)}` : undefined}>
          <Input type="time" name="workEnd" defaultValue={hm(values.workEnd)} required={!optional} />
        </FormField>
        <FormField label="Slot size (min)" name="minSlotMinutes">
          <Input type="number" name="minSlotMinutes" min={5} step={5} defaultValue={values.minSlotMinutes ?? undefined} placeholder={ph(inherited?.minSlotMinutes)} required={!optional} />
        </FormField>
        <FormField label="Longest booking (min)" name="maxDurationMinutes">
          <Input type="number" name="maxDurationMinutes" min={5} step={5} defaultValue={values.maxDurationMinutes ?? undefined} placeholder={ph(inherited?.maxDurationMinutes)} required={!optional} />
        </FormField>
        <FormField label="Buffer after booking (min)" name="bufferMinutes">
          <Input type="number" name="bufferMinutes" min={0} step={5} defaultValue={values.bufferMinutes ?? undefined} placeholder={ph(inherited?.bufferMinutes)} required={!optional} />
        </FormField>
        <FormField label="Cancel at least (min) before" name="cancelCutoffMinutes">
          <Input type="number" name="cancelCutoffMinutes" min={0} step={5} defaultValue={values.cancelCutoffMinutes ?? undefined} placeholder={ph(inherited?.cancelCutoffMinutes)} required={!optional} />
        </FormField>
        <FormField label="Requires approval" name="requiresApproval">
          <Select name="requiresApproval" defaultValue={optional ? approval : approval || "no"}>
            {optional && <option value="">{inherited ? `Inherit (${inherited.requiresApproval ? "yes" : "no"})` : "Inherit"}</option>}
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </FormField>
      </div>
    </fieldset>
  );
}
