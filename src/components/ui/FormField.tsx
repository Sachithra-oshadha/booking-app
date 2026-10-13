"use client";

import { useFieldError } from "./ActionForm";
import styles from "./FormField.module.css";

/** Label + control + error. `name` links the field to the server's field errors. */
export function FormField({
  label,
  name,
  hint,
  children,
}: {
  label: string;
  name?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const error = useFieldError(name);
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        <span>{label}</span>
        {children}
      </label>
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
