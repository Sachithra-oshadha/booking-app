"use client";

import { createContext, useCallback, useContext, useState } from "react";
import styles from "./Toast.module.css";

type Kind = "success" | "error" | "info";
type Item = { id: number; message: string; kind: Kind };
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, message, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
