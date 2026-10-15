import Link from "next/link";
import { FindFreeForm } from "@/components/features/FindFreeForm";
import { ResourceCard } from "@/components/features/ResourceCard";
import { ResourceFilters } from "@/components/features/ResourceFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { db } from "@/db";
import { resourceTypes } from "@/db/schema";
import { fmt } from "@/lib/time";
import { listResources, STATE_ORDER, type LiveStateKey } from "@/server/availability";
import { listLocations } from "@/server/locations";
import { pageUser } from "@/server/session";
import styles from "./page.module.css";
import { CalendarDays } from "lucide-react";

const PAGE_SIZE = 24;

const STATES: { key: LiveStateKey; label: string }[] = [
  { key: "available", label: "Available now" },
  { key: "booked", label: "Booked" },
  { key: "closed", label: "Closed" },
  { key: "out", label: "Out of service" },
];

type Search = { q?: string; type?: string; location?: string; state?: string; page?: string };

export const metadata = { title: "Resources" };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await pageUser("resource:view");
  const sp = await searchParams;
  const [types, locations, all] = await Promise.all([
    db.select({ id: resourceTypes.id, name: resourceTypes.name }).from(resourceTypes).orderBy(resourceTypes.name),
    listLocations(),
    listResources({ q: sp.q, typeId: sp.type, locationId: sp.location }),
  ]);
  const state = STATES.find((s) => s.key === sp.state)?.key;
  const counts = Object.fromEntries(STATES.map((s) => [s.key, all.filter((r) => r.live.state === s.key).length])) as Record<LiveStateKey, number>;
  // Bookable first; Array.sort is stable, so asset-code order holds inside each state.
  const items = (state ? all.filter((r) => r.live.state === state) : [...all]).sort((a, b) => STATE_ORDER[a.live.state] - STATE_ORDER[b.live.state]);

  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const shown = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stateHref = (key?: LiveStateKey) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, type: sp.type, location: sp.location, state: key })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/resources?${s}` : "/resources";
  };

  return (
    <>
      <PageHeader title="Resources" subtitle={`${fmt(new Date(), "EEE d MMM, HH:mm")} · ${counts.available} available right now`} />

      <nav className={styles.summary} aria-label="Filter by availability">
        {STATES.map((s) => {
          const on = state === s.key;
          return (
            <Link key={s.key} href={stateHref(on ? undefined : s.key)} className={`${styles.stat} ${on ? styles.statOn : ""}`} aria-current={on ? "true" : undefined}>
              <span className={styles.statLabel}>
                <span aria-hidden="true" className={`${styles.dot} ${styles[s.key]}`} />
                {s.label}
              </span>
              <span className={styles.statCount}>{counts[s.key]}</span>
            </Link>
          );
        })}
      </nav>

      <ResourceFilters types={types} locations={locations} values={{ q: sp.q, type: sp.type, location: sp.location, state }} />

      <details className={styles.find}>
        <summary>
          <CalendarDays aria-hidden="true" size={16} strokeWidth={1.5} />
          Find a free resource for a later time
        </summary>
        <FindFreeForm types={types} locations={locations.map((l) => ({ id: l.id, label: `${"  ".repeat(l.depth)}${l.name} (${l.kind})` }))} />
      </details>

      {shown.length === 0 ? (
        <EmptyState title="No resources match" action={<Link href="/resources">Clear filters</Link>}>Try clearing a filter.</EmptyState>
      ) : (
        <>
          <div className={styles.resultsBar}>
            <h2 className="sr-only">Results</h2>
            <p className="muted small">
              {items.length} of {all.length} resources · available first
            </p>
          </div>
          <div className={styles.grid}>
            {shown.map((r) => (
              <ResourceCard key={r.id} r={r} />
            ))}
          </div>
        </>
      )}
      <Pagination path="/resources" params={{ q: sp.q, type: sp.type, location: sp.location, state }} page={page} pages={pages} />
    </>
  );
}
