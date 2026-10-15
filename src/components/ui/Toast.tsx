"use client";

import { createContext, useCallback, useContext, useState } from "react";
import styles from "./Toast.module.css";
import { Check, Info, X } from "lucide-react";

const ICON = { success: Check, error: X, info: Info } as const;
type Kind = "success" | "error" | "info";
type Item = { id: number; message: string; kind: Kind };
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, message, kind }]);
    // Errors stay until dismissed so they can be read; the rest clear themselves.
    if (kind !== "error") setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`} role={t.kind === "error" ? "alert" : undefined}>
            <span aria-hidden="true">{(() => { const I = ICON[t.kind]; return <I size={16} />; })()}</span>
            <span className={styles.msg}>{t.message}</span>
            <button type="button" className={styles.close} aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><X size={16} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
