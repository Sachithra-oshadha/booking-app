import Link from "next/link";
import styles from "./Pagination.module.css";
import { ArrowLeft, ArrowRight } from "lucide-react";

/** Prev / next links that keep the other query params. */
export function Pagination({ path, params, page, pages }: { path: string; params: Record<string, string | undefined>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${path}?${q}`;
  };
  return (
    <nav className={styles.bar} aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}><ArrowLeft aria-hidden="true" size={14} style={{ verticalAlign: "text-bottom" }} /> Previous</Link> : <span className="muted" aria-disabled="true"><ArrowLeft aria-hidden="true" size={14} style={{ verticalAlign: "text-bottom" }} /> Previous</span>}
      <span className="muted">
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)}>Next <ArrowRight aria-hidden="true" size={14} style={{ verticalAlign: "text-bottom" }} /></Link> : <span className="muted" aria-disabled="true">Next <ArrowRight aria-hidden="true" size={14} style={{ verticalAlign: "text-bottom" }} /></span>}
    </nav>
  );
}
