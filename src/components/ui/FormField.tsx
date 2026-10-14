"use client";

import { cloneElement, isValidElement, useId } from "react";
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
  const id = useId();
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, error ? { "aria-invalid": true, "aria-describedby": id } : hint ? { "aria-describedby": id } : {})
    : children;
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        <span>{label}</span>
        {control}
      </label>
      {hint && !error && <span id={id} className={styles.hint}>{hint}</span>}
      {error && <span id={id} className={styles.error} role="alert">⚠ {error}</span>}
    </div>
  );
}
