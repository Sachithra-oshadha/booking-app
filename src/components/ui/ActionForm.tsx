"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { Result } from "@/lib/errors";
import { Button } from "./Button";
import styles from "./ActionForm.module.css";
import { useToast } from "./Toast";

const ErrorsCtx = createContext<Record<string, string>>({});
const PendingCtx = createContext(false);

export const useFieldError = (name?: string) => useContext(ErrorsCtx)[name ?? ""];

/**
 * A form that posts its FormData to a server action and shows the typed result:
 * field errors from Zod next to the inputs, a toast for everything else.
 */
export function ActionForm<T>({
  action,
  children,
  successMessage = "Saved",
  resetOnSuccess,
  onResult,
  className,
}: {
  action: (fd: FormData) => Promise<Result<T>>;
  children: React.ReactNode;
  successMessage?: string | ((data: T) => string);
  resetOnSuccess?: boolean;
  onResult?: (r: Result<T>) => void;
  className?: string;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setFormError(null);
        start(async () => {
          const r = await action(fd);
          if (r.ok) {
            setErrors({});
            const custom = (r.data as { message?: string } | null)?.message;
            toast(custom ?? (typeof successMessage === "function" ? successMessage(r.data) : successMessage), "success");
            if (resetOnSuccess) ref.current?.reset();
          } else {
            setErrors(r.fieldErrors ?? {});
            if (!(r.details as { clashes?: unknown } | undefined)?.clashes) setFormError(r.error);
            toast(r.error, "error");
          }
          onResult?.(r);
        });
      }}
    >
      <ErrorsCtx.Provider value={errors}>
        <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      </ErrorsCtx.Provider>
      {formError && <p className={styles.error} role="alert">⚠ {formError}</p>}
    </form>
  );
}

export function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const pending = useContext(PendingCtx);
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}
