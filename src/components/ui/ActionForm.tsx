"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { Result } from "@/lib/errors";
import { Button } from "./Button";
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
        start(async () => {
          const r = await action(fd);
          if (r.ok) {
            setErrors({});
            const custom = (r.data as { message?: string } | null)?.message;
            toast(custom ?? (typeof successMessage === "function" ? successMessage(r.data) : successMessage), "success");
            if (resetOnSuccess) ref.current?.reset();
          } else {
            setErrors(r.fieldErrors ?? {});
            toast(r.error, "error");
          }
          onResult?.(r);
        });
      }}
    >
      <ErrorsCtx.Provider value={errors}>
        <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      </ErrorsCtx.Provider>
    </form>
  );
}

export function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const pending = useContext(PendingCtx);
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}
