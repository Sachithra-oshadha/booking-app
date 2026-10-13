"use client";

import { useRef, useTransition } from "react";
import type { Result } from "@/lib/errors";
import { Button } from "./Button";
import styles from "./ActionButton.module.css";
import { useToast } from "./Toast";

/** Button that runs a (bound) server action, optionally behind a confirm dialog, and toasts the outcome. */
export function ActionButton<T>({
  action,
  children,
  confirm,
  variant = "secondary",
  size = "sm",
  successMessage = "Done",
}: {
  action: () => Promise<Result<T>>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  /** Fallback toast. An action can override it by returning { message } (functions can't cross the server/client boundary). */
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);

  const run = () =>
    start(async () => {
      const r = await action();
      if (r.ok) toast((r.data as { message?: string } | null)?.message ?? successMessage, "success");
      else toast(r.error, "error");
    });

  return (
    <>
      <Button variant={variant} size={size} disabled={pending} onClick={() => (confirm ? dialog.current?.showModal() : run())}>
        {pending ? "Working…" : children}
      </Button>
      {confirm && (
        <dialog ref={dialog} className={styles.dialog}>
          <p>{confirm}</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dialog.current?.close();
                run();
              }}
            >
              Confirm
            </Button>
          </div>
        </dialog>
      )}
    </>
  );
}
