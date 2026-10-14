"use client";

import { useId, useRef, useTransition } from "react";
import type { Result } from "@/lib/errors";
import { Button } from "./Button";
import styles from "./ActionButton.module.css";
import { useToast } from "./Toast";

/** Button that runs a (bound) server action, optionally behind a confirm dialog, and toasts the outcome. */
export function ActionButton<T>({
  action,
  children,
  confirm,
  confirmLabel = "Confirm",
  keepLabel = "Keep",
  variant = "secondary",
  size = "sm",
  successMessage = "Done",
}: {
  action: () => Promise<Result<T>>;
  children: React.ReactNode;
  confirm?: string;
  confirmLabel?: string;
  keepLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  /** Fallback toast. An action can override it by returning { message } (functions can't cross the server/client boundary). */
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const run = () =>
    start(async () => {
      const r = await action();
      if (r.ok) toast((r.data as { message?: string } | null)?.message ?? successMessage, "success");
      else toast(r.error, "error");
    });

  return (
    <>
      <Button variant={variant} size={size} disabled={pending} aria-busy={pending} onClick={() => (confirm ? dialog.current?.showModal() : run())}>
        {pending ? "Working…" : children}
      </Button>
      {confirm && (
        <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
          <p id={titleId}>{confirm}</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              {keepLabel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dialog.current?.close();
                run();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </dialog>
      )}
    </>
  );
}
